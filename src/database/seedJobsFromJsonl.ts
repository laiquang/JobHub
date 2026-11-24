import fs from "fs";
import readline from "readline";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config({ path: "src/server/.env" });

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "3306"),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "jobify_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

function clean(value: any): string {
  if (!value || value === "Không xác định") return "";
  return String(value).trim();
}

function limit(value: any, max: number): string {
  return clean(value).slice(0, max);
}

function parseProvince(location: string): string {
  if (!location) return "Hà Nội";

  const province = location.split(":")[0].trim();

  if (province.includes("Hồ Chí Minh")) return "Hồ Chí Minh";
  if (province.includes("TPHCM")) return "Hồ Chí Minh";
  if (province.includes("TP.HCM")) return "Hồ Chí Minh";
  if (province.includes("HCM")) return "Hồ Chí Minh";
  if (province.includes("Hà Nội")) return "Hà Nội";
  if (province.includes("Đà Nẵng")) return "Đà Nẵng";

  return province || "Hà Nội";
}

function parseSalary(salary: string): [number, number] {
  const value = clean(salary);

  if (
    !value ||
    value.includes("Thoả thuận") ||
    value.includes("Thỏa thuận") ||
    value.includes("Không xác định")
  ) {
    return [0, 0];
  }

  const numbers = value.match(/\d+/g)?.map(Number) || [];

  if (numbers.length >= 2) return [numbers[0], numbers[1]];
  if (numbers.length === 1) return [numbers[0], numbers[0]];

  return [0, 0];
}

function createFakeEmail(companyName: string): string {
  const base =
    companyName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 35) || "company";

  return `${base}@demo.com`.slice(0, 50);
}

async function getProvinceId(name: string): Promise<number> {
  const keyword = clean(name) || "Hà Nội";

  const [rows]: any = await pool.query(
    "SELECT id FROM provinces WHERE name LIKE ? OR nameWithType LIKE ? LIMIT 1",
    [`%${keyword}%`, `%${keyword}%`]
  );

  return rows[0]?.id || 1;
}

async function getFieldId(fieldName: string): Promise<number> {
  const keyword = clean(fieldName) || "Công nghệ Thông tin";

  const [rows]: any = await pool.query(
    "SELECT id FROM fields WHERE name LIKE ? OR typeField LIKE ? LIMIT 1",
    [`%${keyword}%`, `%${keyword}%`]
  );

  return rows[0]?.id || 1;
}

async function getOrCreateCompany(job: any, provinceId: number): Promise<number> {
  const nameCompany = limit(job.name, 80) || "Công ty chưa xác định";

  const [existing]: any = await pool.query(
    "SELECT id FROM companies WHERE nameCompany = ? LIMIT 1",
    [nameCompany]
  );

  if (existing.length > 0) {
    return existing[0].id;
  }

  const [result]: any = await pool.query(
    `INSERT INTO companies
    (nameCompany, nameAdmin, email, password, avatarPic, phone, idProvince, intro, scale)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      nameCompany,
      "Admin",
      createFakeEmail(nameCompany),
      "$2b$10$demoPasswordHash",
      clean(job.company_logo),
      "0900000000",
      provinceId,
      limit(job.company_field, 100),
      limit(job.company_scale, 30),
    ]
  );

  return result.insertId;
}

async function clearOldData(): Promise<void> {
  console.log("Đang xóa data cũ...");

  await pool.query("SET FOREIGN_KEY_CHECKS = 0");

  await pool.query("TRUNCATE TABLE apply_job");
  await pool.query("TRUNCATE TABLE save_job");
  await pool.query("TRUNCATE TABLE follow_company");
  await pool.query("TRUNCATE TABLE notifications");
  await pool.query("TRUNCATE TABLE jobs");
  await pool.query("TRUNCATE TABLE companies");

  await pool.query("SET FOREIGN_KEY_CHECKS = 1");

  console.log("Đã xóa data cũ.");
}

async function seedJobs(): Promise<void> {
  const filePath = "src/database/jobs_processed.jsonl";

  if (!fs.existsSync(filePath)) {
    throw new Error(`Không tìm thấy file: ${filePath}`);
  }

  await clearOldData();

  const fileStream = fs.createReadStream(filePath, { encoding: "utf8" });

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let count = 0;
  let skipped = 0;

  for await (const line of rl) {
    if (!line.trim()) continue;

    try {
      const job = JSON.parse(line);

      const provinceName = parseProvince(clean(job.work_location));
      const provinceId = await getProvinceId(provinceName);

      const fieldId = await getFieldId(
        clean(job.company_field || job.related_categories)
      );

      const companyId = await getOrCreateCompany(job, provinceId);
      const [salaryMin, salaryMax] = parseSalary(clean(job.salary));

      await pool.query(
        `INSERT INTO jobs
        (idCompany, idField, idProvince, nameJob, request, \`desc\`, other,
         salaryMin, salaryMax, sex, typeWork, education, experience, createdAt, deletedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NULL)`,
        [
          companyId,
          fieldId,
          provinceId,
          limit(job.job_title, 150) || "Việc làm chưa có tiêu đề",
          limit(job.candidate_requirements, 3000),
          limit(job.job_description, 3000),
          limit(job.benefits, 3000),
          salaryMin,
          salaryMax,
          "Cả hai",
          limit(job.work_type, 50) || "Toàn thời gian",
          limit(job.education, 50),
          limit(job.experience, 50),
        ]
      );

      count++;

      if (count % 100 === 0) {
        console.log(`Đã import ${count} jobs...`);
      }
    } catch (error) {
      skipped++;
      console.error(`Bỏ qua 1 dòng bị lỗi. Tổng bỏ qua: ${skipped}`);
      console.error(error);
    }
  }

  console.log(`Import thành công ${count} jobs.`);
  console.log(`Số dòng bị bỏ qua: ${skipped}`);

  await pool.end();
  process.exit(0);
}

seedJobs().catch(async (error) => {
  console.error("Lỗi khi import jobs:");
  console.error(error);

  await pool.end();
  process.exit(1);
});