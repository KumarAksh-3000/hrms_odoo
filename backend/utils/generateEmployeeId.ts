import { type Pool } from "pg";

function getNameCode(name: string) {
  const nameParts = name.trim().split(/\s+/).filter(Boolean);

  if (
    nameParts.length < 2 ||
    nameParts[0].length < 2 ||
    nameParts[nameParts.length - 1].length < 2
  ) {
    throw new Error(
      "Name must include first and last name with at least 2 letters each",
    );
  }

  return `${nameParts[0].slice(0, 2)}${nameParts[nameParts.length - 1].slice(0, 2)}`.toUpperCase();
}

function getCompanyCode(companyName: string) {
  const companyParts = companyName.trim().split(/\s+/).filter(Boolean);

  if (companyParts.length >= 2) {
    return `${companyParts[0][0]}${companyParts[1][0]}`.toUpperCase();
  }

  if (companyParts[0]?.length >= 2) {
    return companyParts[0].slice(0, 2).toUpperCase();
  }

  throw new Error("Company name must have at least 2 letters");
}

export async function generateEmployeeId(pool: Pool, companyName: string, name: string) {
  const companyCode = getCompanyCode(companyName);
  const nameCode = getNameCode(name);
  const joiningYear = new Date().getFullYear().toString();

  const result = await pool.query(
    `
      SELECT MAX(RIGHT(employee_id, 4)) AS last_sequence
      FROM users
      WHERE employee_id ~ $1;
    `,
    [`^[A-Z]{2}[A-Z]{4}${joiningYear}[0-9]{4}$`],
  );

  const lastSequence = Number(result.rows[0]?.last_sequence ?? 0);
  const nextSequence = String(lastSequence + 1).padStart(4, "0");

  return `${companyCode}${nameCode}${joiningYear}${nextSequence}`;
}
