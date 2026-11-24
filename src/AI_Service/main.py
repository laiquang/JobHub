from fastapi import FastAPI
from sentence_transformers import SentenceTransformer
import pandas as pd
import numpy as np
import faiss

from pydantic import BaseModel

class SelectedJob(BaseModel):
    title: str
    description: str
    requirements: str


class CVRequest(BaseModel):
    cv_text: str
    selected_job: SelectedJob
app = FastAPI()

print("Loading BGE-M3...")

model = SentenceTransformer(
    "BAAI/bge-m3"
)

print("Loading FAISS...")

index = faiss.read_index(
    "model/job_index.faiss"
)

print("Loading jobs...")

jobs_df = pd.read_csv(
    "model/jobs_vietnamese.csv"
)

print("Done!")

import re

# =========================
# Skill Processing
# =========================

def extract_job_skills(skill_text: str):

    if pd.isna(skill_text):
        return []

    skill_text = str(skill_text).strip()

    if skill_text == "" or skill_text.lower() == "không xác định":
        return []

    skills = [
        skill.strip()
        for skill in skill_text.split(";")
        if skill.strip()
    ]

    return skills


# Những từ không nên coi là skill
IGNORE_SKILLS = {
    "developer",
    "middle",
    "senior",
    "junior",

    "test",
    "training",

    "website",
    "mobile",
    "game",
    "chơi game",

    "framework",

    "it",
    "da",
    "r",

    "backend",
    "frontend",

    "database",

    "cloud",

    "memory management",

    "phân tích",

    "mvc"
}

def extract_selected_job_skills(job):

    text = (
        job.title + " " +
        job.description + " " +
        job.requirements
    ).lower()

    skills = set()

    for value in jobs_df["Kỹ năng"]:

        job_skills = extract_job_skills(value)

        for skill in job_skills:

            skill_name = skill.strip()

            if len(skill_name) < 3:
                continue

            if skill_name.lower() in IGNORE_SKILLS:
                continue

            if skill_name.lower() in text:
                skills.add(skill_name)

    return sorted(list(skills))
def extract_cv_skills(cv_text: str):

    cv_lower = cv_text.lower()

    skills = set()

    for value in jobs_df["Kỹ năng"]:

        job_skills = extract_job_skills(value)

        for skill in job_skills:

            skill_name = skill.strip()

            # bỏ skill quá ngắn
            if len(skill_name) < 3:
                continue

            # bỏ các từ vô nghĩa
            if skill_name.lower() in IGNORE_SKILLS:
                continue

            # tìm trong CV
            if skill_name.lower() in cv_lower:
                skills.add(skill_name)

    return sorted(list(skills))


# =========================
# Test Skill Extraction
# =========================
def compare_skills(cv_skills, job_skills):

    matching = []
    missing = []

    cv_lower = [
        x.lower().strip()
        for x in cv_skills
    ]

    for job_skill in job_skills:

        js = job_skill.lower().strip()

        found = False

        for cv_skill in cv_lower:

            # giống hệt
            if js == cv_skill:
                found = True
                break

            # chứa nhau
            if js in cv_skill:
                found = True
                break

            if cv_skill in js:
                found = True
                break

        if found:
            matching.append(job_skill)
        else:
            missing.append(job_skill)

    return {
        "matchingSkills": matching,
        "missingSkills": missing
    }


def build_ai_result(cv_skills, row, score):

    job_skills = extract_job_skills(
        row["Kỹ năng"]
    )

    skill_result = compare_skills(
        cv_skills,
        job_skills
    )

    return {
        "title": row["Chức danh công việc"],
        "company": row["Tên công ty"],
        "score": round(float(score * 100), 2),

        "matchingSkills": skill_result["matchingSkills"],

        "missingSkills": skill_result["missingSkills"]
    }

@app.get("/")
def root():
    return {
        "message": "AI Service Running"
    }

@app.post("/evaluate")
def evaluate(data: CVRequest):

    embedding = model.encode(
        data.cv_text,
        normalize_embeddings=True
    )
    cv_skills = extract_cv_skills(data.cv_text)
    selected_job_skills = extract_selected_job_skills(
        data.selected_job
    )

    print("\n========== CV SKILLS ==========")
    print(cv_skills)
    print("===============================\n")

    D, I = index.search(
        np.array([embedding]),
        5
    )

    recommended_jobs = []

    for score, idx in zip(D[0], I[0]):

        row = jobs_df.iloc[idx]

        recommended_jobs.append(
            build_ai_result(
                cv_skills,
                row,
                score
            )
        )

    selected_skill_result = compare_skills(
        cv_skills,
        selected_job_skills
    )
    job_text = (
        data.selected_job.title
        + "\n"
        + data.selected_job.description
        + "\n"
        + data.selected_job.requirements
    )

    job_embedding = model.encode(
        job_text,
        normalize_embeddings=True
    )

    similarity = float(
        np.dot(
            embedding,
            job_embedding
        )
    ) * 100
    return {

    "recommendedJobs": recommended_jobs,

    "bestJob": recommended_jobs[0],

    "similarity": round(similarity,2),

    "matchingSkills":
        selected_skill_result["matchingSkills"],

    "missingSkills":
        selected_skill_result["missingSkills"],

    "cvSkills": cv_skills
}