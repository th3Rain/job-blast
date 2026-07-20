import { describe, it, expect } from "vitest";
import { scoreListing, extractResumeSkills, type ScoreProfile } from "./scoring";

const profile: ScoreProfile = {
  targetRoles: ["DevOps Engineer", "Site Reliability Engineer", "Cloud Engineer"],
  targetLocations: ["Remote", "United States"],
  salaryFloor: 100000,
  excludedCompanies: ["BadCorp"],
  resumeSkills: ["kubernetes", "aws", "azure", "terraform", "docker", "python", "cicd"],
  desiredSeniority: ["mid", "senior"],
};

describe("scoreListing", () => {
  it("scores a strong on-target remote senior role highly", () => {
    const { score, reasons } = scoreListing(profile, {
      title: "Senior DevOps Engineer",
      company: "Acme",
      description: "Kubernetes, AWS, Docker, CI/CD pipelines and Python automation.",
      location: "Location not specified",
      isRemote: true,
      salaryMin: 140000,
      salaryMax: 180000,
      seniority: "senior",
    });
    expect(score).toBeGreaterThanOrEqual(80);
    expect(reasons.join(" ")).toMatch(/Title matches/);
    expect(reasons.join(" ")).toMatch(/Remote/);
  });

  it("hard-excludes excluded companies with score 0", () => {
    const { score, reasons } = scoreListing(profile, {
      title: "Senior DevOps Engineer",
      company: "BadCorp",
      description: "kubernetes aws",
      location: "Remote",
      isRemote: true,
      seniority: "senior",
    });
    expect(score).toBe(0);
    expect(reasons[0]).toMatch(/Excluded/);
  });

  it("scores an off-target unrelated role low", () => {
    const { score } = scoreListing(profile, {
      title: "Registered Nurse",
      company: "Hospital",
      description: "Patient care and clinical duties.",
      location: "Dallas, Texas",
      isRemote: false,
      seniority: "mid",
    });
    expect(score).toBeLessThan(35);
  });

  it("penalizes pay below the salary floor", () => {
    const below = scoreListing(profile, {
      title: "DevOps Engineer",
      company: "Acme",
      description: "aws kubernetes",
      location: "Remote",
      isRemote: true,
      salaryMin: 50000,
      salaryMax: 70000,
      seniority: "mid",
    });
    expect(below.reasons.join(" ")).toMatch(/below your floor/);
  });

  it("ranks a fully-matching title above a partial one", () => {
    const full = scoreListing(profile, {
      title: "Cloud Engineer",
      company: "A",
      description: "aws azure",
      location: "Remote",
      isRemote: true,
      seniority: "mid",
    });
    const partial = scoreListing(profile, {
      title: "Cloud Sales Representative",
      company: "B",
      description: "selling cloud",
      location: "Remote",
      isRemote: true,
      seniority: "mid",
    });
    expect(full.score).toBeGreaterThan(partial.score);
  });
});

describe("extractResumeSkills", () => {
  it("pulls tokens from the Skills section", () => {
    const resume = `# Me\n## Summary\nsome text\n## Skills\nKubernetes, AWS, Terraform, Docker\n## Education\nSchool`;
    const skills = extractResumeSkills(resume);
    expect(skills).toContain("kubernetes");
    expect(skills).toContain("terraform");
    // Should not bleed in the education section token.
    expect(skills).not.toContain("school");
  });
});
