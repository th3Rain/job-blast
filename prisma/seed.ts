import { PrismaClient } from "@prisma/client";
import type { CoverTemplate } from "../src/lib/types";

const prisma = new PrismaClient();

// Master resume from Gabriel Oyeyemi's CV. Fully editable in the app; tailoring
// reorders/rewords these bullets per job description (never invents new facts).
const MASTER_RESUME = `# Gabriel Oyeyemi — Principal DevOps & Platform Engineer
DevSecOps · Cloud Infrastructure · Payments Technology
Limerick, Ireland · oyeyemigabriel97@gmail.com · +353 899 814 813

## Summary
Senior Platform Engineer and technical leader with 8+ years designing and
operating cloud-native infrastructure, DevSecOps pipelines, and platform
engineering across Azure, AWS, GCP, and Huawei Cloud. Built a production-grade
payments platform from the ground up processing hundreds of thousands of
transactions monthly with zero infrastructure-related downtime, achieving 99%+
uptime and 100% PCI DSS 4.0/CBN compliance at a Stanbic IBTC fintech subsidiary.
Expert in Terraform, Ansible, Kubernetes (CKA-certified), Helm, and secure
software delivery; currently architecting distributed cloud-native
infrastructure at the University of Limerick.

## Core Technical Competencies
- Cloud: Azure (AKS, Hub-and-Spoke, Entra ID, Sentinel, Defender for Cloud, API Mgmt, Functions), AWS (EC2, EKS, S3), GCP (GKE), Huawei Cloud, OpenStack, Proxmox VE
- IaC: Terraform, Ansible, ARM Templates; GitOps via ArgoCD & Kustomize; Helm; Jinja; Pulumi (familiar)
- DevSecOps & CI/CD: Azure DevOps, Jenkins, GitLab CI, GitHub Actions; SAST, secret scanning, dependency scanning, automated quality gates
- Containers & Orchestration: Kubernetes (k3s, MicroK8s, AKS, GKE) — CKA Certified; Docker (DooD/DinD); Apptainer; Helm; RabbitMQ, NGINX
- Security & Compliance: PCI DSS 4.0, NDPR, CBN; VAPT (Burp Suite, OWASP ZAP); IAM/PIM/RBAC; Microsoft Sentinel; SOC operations
- Languages: Python, Bash/Shell, PowerShell, YAML, Terraform HCL, Go (foundational), SQL; Linux/Windows administration

## Professional Experience

### System Administrator & Platform Engineer — WAVE Research Centre, University of Limerick (Nov 2025 – Present), Limerick, Ireland
- Design and operate hybrid cloud-native infrastructure for the WAVE low-code/no-code orchestration platform across federated environments.
- Manage Kubernetes clusters (k3s, MicroK8s), Proxmox VE virtualisation on Dell PowerEdge R720 with ZFS storage, and secure execution environments (Apptainer, Docker DooD/DinD).
- Implement Terraform and Ansible IaC for scalable platform foundations; define DNS, networking, and cloud configuration underpinning a Hybrid Control/Data Plane architecture.

### DevOps & Cloud Infrastructure Lead — Zest Payment (Standard Bank Group / Stanbic IBTC) (Mar 2023 – Nov 2025), Lagos, Nigeria — Hybrid
- Pioneered the DevOps and infrastructure function from the ground up, building a production-grade cloud platform processing hundreds of thousands of financial transactions monthly with zero infrastructure-related downtime.
- Architected an Azure Hub-and-Spoke network achieving secure workload segmentation and a 40% reduction in cloud costs via rightsizing and reserved instances.
- Delivered 99%+ uptime across a multi-cloud estate (Azure, AWS, Huawei Cloud); engineered a multi-cloud migration with sub-minute DNS failover and zero data loss, saving 30%+ on cloud consumption.
- Managed hundreds of Kubernetes workloads using Kustomize and ArgoCD GitOps; authored Terraform IaC and Ansible playbooks for provisioning and environment parity across Dev/Staging/Production.
- Designed and enforced secure build/release/delivery pipelines (linting, secret scanning, SAST, dependency scanning) for a PCI DSS-regulated payments platform.

### Acting Lead, Cybersecurity — Zest Payment (Stanbic IBTC) (Jul 2024 – May 2025), Lagos, Nigeria — Hybrid
- Led PCI DSS 4.0, CBN, NDPR, and Group Audit campaigns, achieving 100% compliance with zero cyber incidents.
- Improved SOC efficiency by 33% through automated incident-response playbooks and real-time alerting; remediated 80% of vulnerabilities pre-deployment via proactive VAPT.

### Technical Product Owner & Lead Business Analyst — Huawei Technologies Nigeria (Dec 2021 – Feb 2023), Lagos, Nigeria
- Automated 80% of manual reporting workflows using Python and Power BI, saving 100+ analyst hours/month and cutting turnaround from 24 hours to under 2.

### DevOps & Cloud Security Researcher — CApIC-ACE, Covenant University (Mar 2021 – Apr 2023), Ogun State, Nigeria
- Managed CI/CD and IaC (Kubernetes, Terraform, Ansible) on a FEDGEN federated OpenStack environment; implemented a fuzzy federated-learning IDS reducing false positives by 28%.

## Education
- Ph.D., Computer Science (Formal Methods, Distributed Systems, Active Automata Learning) — University of Limerick, Ireland (2025–2029, in progress)
- M.Sc., Computer Science (Fuzzy Federated Learning-Based Intrusion Detection) — Covenant University (4.73/5.00, Distinction, 1st in class)
- B.Sc., Computer Science — Lagos State University

## Certifications
Google Cloud Professional Cloud Architect; CKA (Certified Kubernetes Administrator);
Microsoft Azure Security Engineer Associate; KCNA; Google Cloud Associate Cloud
Engineer; Microsoft DevOps Engineer Expert; GitHub Administrator; AWS Certified
Cloud Practitioner; CompTIA Security+; Azure Administrator Associate (AZ-104);
Microsoft Certified Trainer.`;

const COVER_TEMPLATES: CoverTemplate[] = [
  {
    name: "Professional",
    tone: "professional",
    body: `Dear Hiring Team at {{company}},

I'm writing to apply for the {{role}} position. As a Principal DevOps & Platform
Engineer based in Limerick with 8+ years building secure, highly available
cloud-native infrastructure across Azure, AWS, and GCP — including a
PCI DSS-compliant payments platform — I believe I can contribute immediately.

I'd welcome the chance to discuss the role and my eligibility to work in Ireland.

Best regards,
Gabriel Oyeyemi`,
  },
  {
    name: "Direct",
    tone: "direct",
    body: `Hi {{company}} team,

The {{role}} opening lines up closely with what I do: running production
Kubernetes, building CI/CD pipelines with Terraform and GitOps, and hardening
cloud infrastructure with a DevSecOps mindset. I'm Limerick-based and CKA-certified.

Happy to walk through specifics whenever works.

Thanks,
Gabriel Oyeyemi`,
  },
  {
    name: "Warm",
    tone: "warm",
    body: `Hello {{company}},

The {{role}} role caught my eye — I really enjoy the work of keeping cloud
systems reliable and secure, and I've spent the last several years doing exactly
that in regulated payments and platform-engineering environments here in Ireland.

I'd love to learn more about your team and how I could help.

Warm regards,
Gabriel Oyeyemi`,
  },
];

async function main() {
  const email = "oyeyemigabriel97@gmail.com";

  const fields = {
    masterResume: MASTER_RESUME,
    coverTemplates: JSON.stringify(COVER_TEMPLATES),
    targetRoles: JSON.stringify([
      "Platform Engineer",
      "DevOps Engineer",
      "Site Reliability Engineer",
      "SRE",
      "DevSecOps Engineer",
      "Cloud Engineer",
      "Cloud Architect",
      "Kubernetes Engineer",
      "Cloud Infrastructure Engineer",
    ]),
    targetLocations: JSON.stringify(["Ireland", "Limerick", "Dublin", "Cork", "Galway", "Remote"]),
    salaryFloor: 65000,
    excludedCompanies: JSON.stringify([]),
    dailyGoal: 20,
    sponsorshipRequired: true,
  };

  const user = await prisma.user.upsert({
    where: { email },
    update: fields,
    create: { email, ...fields },
  });

  console.log(`Seeded user ${user.email} (id=${user.id}) — Ireland + sponsorship targeting`);
  console.log("Next: `npm run ingest indeed` then `npm run score`.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
