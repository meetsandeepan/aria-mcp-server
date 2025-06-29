import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
// Authentication state
let authToken = null;
let tokenExpiry = null;
// Default configuration - should be set via environment variables
const ariaConfig = {
    baseUrl: process.env.ARIA_BASE_URL || "https://api.ariaaccess.com",
    clientId: process.env.ARIA_CLIENT_ID || "",
    clientSecret: process.env.ARIA_CLIENT_SECRET || "",
    username: process.env.ARIA_USERNAME || "",
    password: process.env.ARIA_PASSWORD || "",
};
// Authentication schemas
const AuthRequestSchema = z.object({
    clientId: z.string().describe("ARIA client ID"),
    clientSecret: z.string().describe("ARIA client secret"),
    username: z.string().describe("ARIA username"),
    password: z.string().describe("ARIA password"),
});
const PatientSearchSchema = z.object({
    patientId: z.string().optional().describe("Patient ID"),
    firstName: z.string().optional().describe("Patient first name"),
    lastName: z.string().optional().describe("Patient last name"),
    dateOfBirth: z.string().optional().describe("Date of birth (YYYY-MM-DD)"),
    mrn: z.string().optional().describe("Medical Record Number"),
});
const AppointmentSchema = z.object({
    patientId: z.string().describe("Patient ID"),
    startDate: z.string().describe("Start date (YYYY-MM-DD)"),
    endDate: z.string().describe("End date (YYYY-MM-DD)"),
    resourceId: z.string().optional().describe("Resource ID"),
});
const DiagnosisSchema = z.object({
    patientId: z.string().describe("Patient ID"),
    diagnosisId: z.string().optional().describe("Diagnosis ID"),
});
const BillingSchema = z.object({
    patientId: z.string().describe("Patient ID"),
    startDate: z.string().optional().describe("Start date (YYYY-MM-DD)"),
    endDate: z.string().optional().describe("End date (YYYY-MM-DD)"),
});
const RadiationTherapySchema = z.object({
    patientId: z.string().describe("Patient ID"),
    courseId: z.string().optional().describe("Course ID"),
    planId: z.string().optional().describe("Plan ID"),
    treatmentId: z.string().optional().describe("Treatment ID"),
});
const ResourceSchema = z.object({
    resourceId: z.string().optional().describe("Resource ID"),
    resourceType: z.string().optional().describe("Resource type"),
    startDate: z.string().optional().describe("Start date (YYYY-MM-DD)"),
    endDate: z.string().optional().describe("End date (YYYY-MM-DD)"),
});
// Helper function to authenticate with ARIA
async function authenticate() {
    try {
        const authUrl = `${ariaConfig.baseUrl}/auth/token`;
        const response = await fetch(authUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                grant_type: "password",
                client_id: ariaConfig.clientId,
                client_secret: ariaConfig.clientSecret,
                username: ariaConfig.username,
                password: ariaConfig.password,
            }),
        });
        if (!response.ok) {
            throw new Error(`Authentication failed: ${response.status}`);
        }
        const data = await response.json();
        return data.access_token;
    }
    catch (error) {
        console.error("Authentication error:", error);
        return null;
    }
}
// Helper function to get valid auth token
async function getAuthToken() {
    if (authToken && tokenExpiry && Date.now() < tokenExpiry) {
        return authToken;
    }
    const token = await authenticate();
    if (token) {
        authToken = token;
        // Set expiry to 1 hour from now (adjust based on actual token expiry)
        tokenExpiry = Date.now() + 3600000;
    }
    return token;
}
// Helper function for making authenticated API requests
async function makeAriaRequest(endpoint, params) {
    const token = await getAuthToken();
    if (!token) {
        throw new Error("Failed to authenticate with ARIA");
    }
    const url = new URL(`${ariaConfig.baseUrl}${endpoint}`);
    if (params) {
        Object.entries(params).forEach(([key, value]) => {
            url.searchParams.append(key, value);
        });
    }
    const response = await fetch(url.toString(), {
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
    });
    if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    return response.json();
}
// Create MCP server instance
const server = new McpServer({
    name: "aria-access",
    version: "1.0.0",
});
// Authentication tool
server.tool("authenticate", "Authenticate with ARIA Access API", {
    clientId: z.string().describe("ARIA client ID"),
    clientSecret: z.string().describe("ARIA client secret"),
    username: z.string().describe("ARIA username"),
    password: z.string().describe("ARIA password"),
}, async ({ clientId, clientSecret, username, password }) => {
    try {
        // Update config with provided credentials
        ariaConfig.clientId = clientId;
        ariaConfig.clientSecret = clientSecret;
        ariaConfig.username = username;
        ariaConfig.password = password;
        const token = await authenticate();
        if (token) {
            return {
                content: [
                    {
                        type: "text",
                        text: "Successfully authenticated with ARIA Access API",
                    },
                ],
            };
        }
        else {
            return {
                content: [
                    {
                        type: "text",
                        text: "Authentication failed. Please check your credentials.",
                    },
                ],
            };
        }
    }
    catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: `Authentication error: ${error instanceof Error ? error.message : "Unknown error"}`,
                },
            ],
        };
    }
});
// Patient Demographics tool
server.tool("get-patient-demographics", "Get patient demographic information", {
    patientId: z.string().optional().describe("Patient ID"),
    firstName: z.string().optional().describe("Patient first name"),
    lastName: z.string().optional().describe("Patient last name"),
    dateOfBirth: z.string().optional().describe("Date of birth (YYYY-MM-DD)"),
    mrn: z.string().optional().describe("Medical Record Number"),
}, async ({ patientId, firstName, lastName, dateOfBirth, mrn }) => {
    try {
        const params = {};
        if (patientId)
            params.patientId = patientId;
        if (firstName)
            params.firstName = firstName;
        if (lastName)
            params.lastName = lastName;
        if (dateOfBirth)
            params.dateOfBirth = dateOfBirth;
        if (mrn)
            params.mrn = mrn;
        const patients = await makeAriaRequest("/patients", params);
        if (!patients || patients.length === 0) {
            return {
                content: [
                    {
                        type: "text",
                        text: "No patients found matching the provided criteria.",
                    },
                ],
            };
        }
        const formattedPatients = patients.map(patient => `
Patient ID: ${patient.patientId}
Name: ${patient.firstName} ${patient.lastName}
Date of Birth: ${patient.dateOfBirth}
MRN: ${patient.mrn}
Gender: ${patient.gender}
Address: ${patient.address?.street || ""}, ${patient.address?.city || ""}, ${patient.address?.state || ""} ${patient.address?.zipCode || ""}
Phone: ${patient.phone || "N/A"}
Email: ${patient.email || "N/A"}
---`).join("\n");
        return {
            content: [
                {
                    type: "text",
                    text: `Found ${patients.length} patient(s):\n${formattedPatients}`,
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error retrieving patient demographics: ${error instanceof Error ? error.message : "Unknown error"}`,
                },
            ],
        };
    }
});
// Resource Management tool
server.tool("get-resources", "Get available resources (machines, rooms, staff)", {
    resourceId: z.string().optional().describe("Resource ID"),
    resourceType: z.string().optional().describe("Resource type"),
    startDate: z.string().optional().describe("Start date (YYYY-MM-DD)"),
    endDate: z.string().optional().describe("End date (YYYY-MM-DD)"),
}, async ({ resourceId, resourceType, startDate, endDate }) => {
    try {
        const params = {};
        if (resourceId)
            params.resourceId = resourceId;
        if (resourceType)
            params.resourceType = resourceType;
        if (startDate)
            params.startDate = startDate;
        if (endDate)
            params.endDate = endDate;
        const resources = await makeAriaRequest("/resources", params);
        if (!resources || resources.length === 0) {
            return {
                content: [
                    {
                        type: "text",
                        text: "No resources found matching the provided criteria.",
                    },
                ],
            };
        }
        const formattedResources = resources.map(resource => `
Resource ID: ${resource.resourceId}
Type: ${resource.resourceType}
Name: ${resource.name}
Status: ${resource.status}
Location: ${resource.location || "N/A"}
Available: ${resource.isAvailable ? "Yes" : "No"}
---`).join("\n");
        return {
            content: [
                {
                    type: "text",
                    text: `Found ${resources.length} resource(s):\n${formattedResources}`,
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error retrieving resources: ${error instanceof Error ? error.message : "Unknown error"}`,
                },
            ],
        };
    }
});
// Patient Diagnosis tool
server.tool("get-patient-diagnosis", "Get patient diagnosis information", {
    patientId: z.string().describe("Patient ID"),
    diagnosisId: z.string().optional().describe("Diagnosis ID"),
}, async ({ patientId, diagnosisId }) => {
    try {
        const params = { patientId };
        if (diagnosisId)
            params.diagnosisId = diagnosisId;
        const diagnoses = await makeAriaRequest("/diagnoses", params);
        if (!diagnoses || diagnoses.length === 0) {
            return {
                content: [
                    {
                        type: "text",
                        text: "No diagnoses found for this patient.",
                    },
                ],
            };
        }
        const formattedDiagnoses = diagnoses.map(diagnosis => `
Diagnosis ID: ${diagnosis.diagnosisId}
Primary Site: ${diagnosis.primarySite || "N/A"}
Histology: ${diagnosis.histology || "N/A"}
Stage: ${diagnosis.stage || "N/A"}
Date: ${diagnosis.diagnosisDate || "N/A"}
Status: ${diagnosis.status || "N/A"}
Notes: ${diagnosis.notes || "N/A"}
---`).join("\n");
        return {
            content: [
                {
                    type: "text",
                    text: `Found ${diagnoses.length} diagnosis(es):\n${formattedDiagnoses}`,
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error retrieving patient diagnosis: ${error instanceof Error ? error.message : "Unknown error"}`,
                },
            ],
        };
    }
});
// Appointment Management tool
server.tool("get-appointments", "Get patient appointments", {
    patientId: z.string().describe("Patient ID"),
    startDate: z.string().describe("Start date (YYYY-MM-DD)"),
    endDate: z.string().describe("End date (YYYY-MM-DD)"),
    resourceId: z.string().optional().describe("Resource ID"),
}, async ({ patientId, startDate, endDate, resourceId }) => {
    try {
        const params = { patientId, startDate, endDate };
        if (resourceId)
            params.resourceId = resourceId;
        const appointments = await makeAriaRequest("/appointments", params);
        if (!appointments || appointments.length === 0) {
            return {
                content: [
                    {
                        type: "text",
                        text: "No appointments found for this patient in the specified date range.",
                    },
                ],
            };
        }
        const formattedAppointments = appointments.map(appointment => `
Appointment ID: ${appointment.appointmentId}
Date: ${appointment.appointmentDate}
Time: ${appointment.startTime} - ${appointment.endTime}
Type: ${appointment.appointmentType}
Status: ${appointment.status}
Resource: ${appointment.resourceName || "N/A"}
Provider: ${appointment.providerName || "N/A"}
Notes: ${appointment.notes || "N/A"}
---`).join("\n");
        return {
            content: [
                {
                    type: "text",
                    text: `Found ${appointments.length} appointment(s):\n${formattedAppointments}`,
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error retrieving appointments: ${error instanceof Error ? error.message : "Unknown error"}`,
                },
            ],
        };
    }
});
// Billing Data tool
server.tool("get-billing-data", "Get patient billing information", {
    patientId: z.string().describe("Patient ID"),
    startDate: z.string().optional().describe("Start date (YYYY-MM-DD)"),
    endDate: z.string().optional().describe("End date (YYYY-MM-DD)"),
}, async ({ patientId, startDate, endDate }) => {
    try {
        const params = { patientId };
        if (startDate)
            params.startDate = startDate;
        if (endDate)
            params.endDate = endDate;
        const billingData = await makeAriaRequest("/billing", params);
        if (!billingData || billingData.length === 0) {
            return {
                content: [
                    {
                        type: "text",
                        text: "No billing data found for this patient.",
                    },
                ],
            };
        }
        const formattedBilling = billingData.map(bill => `
Bill ID: ${bill.billId}
Date: ${bill.billDate}
Amount: $${bill.amount || "0.00"}
Status: ${bill.status}
Insurance: ${bill.insuranceProvider || "N/A"}
Procedure: ${bill.procedureCode || "N/A"}
Description: ${bill.procedureDescription || "N/A"}
---`).join("\n");
        return {
            content: [
                {
                    type: "text",
                    text: `Found ${billingData.length} billing record(s):\n${formattedBilling}`,
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error retrieving billing data: ${error instanceof Error ? error.message : "Unknown error"}`,
                },
            ],
        };
    }
});
// Radiation Therapy Data tools
server.tool("get-radiation-courses", "Get radiation therapy courses for a patient", {
    patientId: z.string().describe("Patient ID"),
    courseId: z.string().optional().describe("Course ID"),
}, async ({ patientId, courseId }) => {
    try {
        const params = { patientId };
        if (courseId)
            params.courseId = courseId;
        const courses = await makeAriaRequest("/radiation/courses", params);
        if (!courses || courses.length === 0) {
            return {
                content: [
                    {
                        type: "text",
                        text: "No radiation therapy courses found for this patient.",
                    },
                ],
            };
        }
        const formattedCourses = courses.map(course => `
Course ID: ${course.courseId}
Course Name: ${course.courseName}
Start Date: ${course.startDate}
End Date: ${course.endDate}
Status: ${course.status}
Total Fractions: ${course.totalFractions}
Completed Fractions: ${course.completedFractions}
Prescription Dose: ${course.prescriptionDose} ${course.doseUnit}
Target Volume: ${course.targetVolume || "N/A"}
---`).join("\n");
        return {
            content: [
                {
                    type: "text",
                    text: `Found ${courses.length} radiation therapy course(s):\n${formattedCourses}`,
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error retrieving radiation courses: ${error instanceof Error ? error.message : "Unknown error"}`,
                },
            ],
        };
    }
});
server.tool("get-treatment-plans", "Get radiation treatment plans", {
    patientId: z.string().describe("Patient ID"),
    courseId: z.string().optional().describe("Course ID"),
    planId: z.string().optional().describe("Plan ID"),
}, async ({ patientId, courseId, planId }) => {
    try {
        const params = { patientId };
        if (courseId)
            params.courseId = courseId;
        if (planId)
            params.planId = planId;
        const plans = await makeAriaRequest("/radiation/plans", params);
        if (!plans || plans.length === 0) {
            return {
                content: [
                    {
                        type: "text",
                        text: "No treatment plans found for this patient.",
                    },
                ],
            };
        }
        const formattedPlans = plans.map(plan => `
Plan ID: ${plan.planId}
Plan Name: ${plan.planName}
Course ID: ${plan.courseId}
Plan Type: ${plan.planType}
Status: ${plan.status}
Created Date: ${plan.createdDate}
Approved Date: ${plan.approvedDate || "Not approved"}
Total Dose: ${plan.totalDose} ${plan.doseUnit}
Fractions: ${plan.fractions}
Beam Count: ${plan.beamCount || "N/A"}
---`).join("\n");
        return {
            content: [
                {
                    type: "text",
                    text: `Found ${plans.length} treatment plan(s):\n${formattedPlans}`,
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error retrieving treatment plans: ${error instanceof Error ? error.message : "Unknown error"}`,
                },
            ],
        };
    }
});
server.tool("get-treatments", "Get radiation treatment sessions", {
    patientId: z.string().describe("Patient ID"),
    courseId: z.string().optional().describe("Course ID"),
    planId: z.string().optional().describe("Plan ID"),
    treatmentId: z.string().optional().describe("Treatment ID"),
}, async ({ patientId, courseId, planId, treatmentId }) => {
    try {
        const params = { patientId };
        if (courseId)
            params.courseId = courseId;
        if (planId)
            params.planId = planId;
        if (treatmentId)
            params.treatmentId = treatmentId;
        const treatments = await makeAriaRequest("/radiation/treatments", params);
        if (!treatments || treatments.length === 0) {
            return {
                content: [
                    {
                        type: "text",
                        text: "No treatments found for this patient.",
                    },
                ],
            };
        }
        const formattedTreatments = treatments.map(treatment => `
Treatment ID: ${treatment.treatmentId}
Treatment Date: ${treatment.treatmentDate}
Fraction Number: ${treatment.fractionNumber}
Course ID: ${treatment.courseId}
Plan ID: ${treatment.planId}
Status: ${treatment.status}
Machine: ${treatment.machineName || "N/A"}
Technologist: ${treatment.technologistName || "N/A"}
Dose Delivered: ${treatment.doseDelivered} ${treatment.doseUnit}
Treatment Time: ${treatment.treatmentTime || "N/A"}
Notes: ${treatment.notes || "N/A"}
---`).join("\n");
        return {
            content: [
                {
                    type: "text",
                    text: `Found ${treatments.length} treatment session(s):\n${formattedTreatments}`,
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error retrieving treatments: ${error instanceof Error ? error.message : "Unknown error"}`,
                },
            ],
        };
    }
});
// Start the server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("ARIA Access MCP Server running on stdio");
}
main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
