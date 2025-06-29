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
// Helper function for making authenticated API requests with ARIA-specific formatting
async function makeAriaRequest(endpoint, requestData, params) {
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
    const requestOptions = {
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
    };
    // If requestData is provided, format it according to ARIA API specifications
    if (requestData) {
        requestOptions.method = "POST";
        requestOptions.body = JSON.stringify(requestData);
    }
    else {
        requestOptions.method = "GET";
    }
    const response = await fetch(url.toString(), requestOptions);
    if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    return response.json();
}
// Helper function to format ARIA request data
function formatAriaRequest(requestType, data) {
    const formattedData = {
        "__type": `${requestType}:http://services.varian.com/AriaWebConnect/Link`,
        "Attributes": null,
    };
    // Format each field according to ARIA API specification
    Object.entries(data).forEach(([key, value]) => {
        formattedData[key] = { "Value": value };
    });
    return formattedData;
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
        // Format request according to GetPatientsRequest
        const requestData = formatAriaRequest("GetPatientsRequest", {
            PatientId1: patientId || "",
            PatientId2: mrn || "",
            FirstName: firstName || "",
            LastName: lastName || "",
            IsMultipleNamesRequired: null,
            MatchingCriteria: null
        });
        const patients = await makeAriaRequest("/Gateway/Service.svc/rest/Process", requestData);
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
Patient ID: ${patient.patientId || patient.PatientId1?.Value || "N/A"}
Name: ${patient.firstName || patient.FirstName?.Value || ""} ${patient.lastName || patient.LastName?.Value || ""}
Date of Birth: ${patient.dateOfBirth || patient.Birthdate?.Value || "N/A"}
MRN: ${patient.mrn || patient.PatientId2?.Value || "N/A"}
Gender: ${patient.gender || patient.Sex?.Value || "N/A"}
Address: ${patient.addressLine1 || patient.AddressLine1?.Value || ""}, ${patient.cityOrTownship || patient.CityorTownship?.Value || ""}, ${patient.stateOrProvince || patient.StateOrProvince?.Value || ""} ${patient.postalCode || patient.PostalCode?.Value || ""}
Phone: ${patient.homePhoneNumber || patient.HomePhoneNumber?.Value || "N/A"}
Email: ${patient.email || "N/A"}
Status: ${patient.patientStatus || patient.PatientStatus?.Value || "N/A"}
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
// Create Patient tool
server.tool("create-patient", "Create a new patient in ARIA", {
    firstName: z.string().describe("Patient first name"),
    lastName: z.string().describe("Patient last name"),
    middleName: z.string().optional().describe("Patient middle name"),
    dateOfBirth: z.string().describe("Date of birth (YYYY-MM-DD)"),
    sex: z.string().describe("Patient sex (Male/Female)"),
    patientId1: z.string().describe("Primary patient ID"),
    patientId2: z.string().optional().describe("Secondary patient ID (MRN)"),
    addressLine1: z.string().optional().describe("Address line 1"),
    addressLine2: z.string().optional().describe("Address line 2"),
    cityOrTownship: z.string().optional().describe("City or township"),
    stateOrProvince: z.string().optional().describe("State or province"),
    postalCode: z.string().optional().describe("Postal code"),
    country: z.string().optional().describe("Country"),
    homePhoneNumber: z.string().optional().describe("Home phone number"),
    workPhoneNumber: z.string().optional().describe("Work phone number"),
    maritalStatus: z.string().optional().describe("Marital status"),
    race: z.string().optional().describe("Race"),
    religion: z.string().optional().describe("Religion"),
    occupation: z.string().optional().describe("Occupation"),
    hospitalName: z.string().optional().describe("Hospital name"),
    departmentId: z.string().optional().describe("Department ID"),
}, async ({ firstName, lastName, middleName, dateOfBirth, sex, patientId1, patientId2, addressLine1, addressLine2, cityOrTownship, stateOrProvince, postalCode, country, homePhoneNumber, workPhoneNumber, maritalStatus, race, religion, occupation, hospitalName, departmentId }) => {
    try {
        // Format request according to CreatePatientRequest
        const requestData = formatAriaRequest("CreatePatientRequest", {
            FirstName: firstName,
            LastName: lastName,
            MiddleName: middleName || "",
            Birthdate: dateOfBirth,
            Sex: sex,
            PatientId1: patientId1,
            PatientId2: patientId2 || "",
            AddressLine1: addressLine1 || "",
            AddressLine2: addressLine2 || "",
            CityorTownship: cityOrTownship || "",
            StateOrProvince: stateOrProvince || "",
            PostalCode: postalCode || "",
            Country: country || "United States",
            HomePhoneNumber: homePhoneNumber || "",
            WorkPhoneNumber: workPhoneNumber || "",
            MaritalStatus: maritalStatus || "SINGLE",
            Race: race || "",
            Religion: religion || "",
            Occupation: occupation || "",
            HospitalName: hospitalName || "AA_Hospital_1",
            DepartmentId: departmentId || "Oncology11",
            PatientStatus: "New Patient (NP)",
            PatientState: "Alive",
            AreaName: "Caller Application Name",
            IsTimeStampCheckRequired: false,
            Attributes: null
        });
        const result = await makeAriaRequest("/Gateway/Service.svc/rest/Process", requestData);
        if (result && result.success !== false) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Patient created successfully!\nPatient ID: ${patientId1}\nName: ${firstName} ${lastName}\nDate of Birth: ${dateOfBirth}`,
                    },
                ],
            };
        }
        else {
            return {
                content: [
                    {
                        type: "text",
                        text: `Failed to create patient: ${result?.errorMessage || "Unknown error"}`,
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
                    text: `Error creating patient: ${error instanceof Error ? error.message : "Unknown error"}`,
                },
            ],
        };
    }
});
// Update Patient tool
server.tool("update-patient", "Update an existing patient in ARIA", {
    patientId1: z.string().describe("Primary patient ID"),
    firstName: z.string().optional().describe("Patient first name"),
    lastName: z.string().optional().describe("Patient last name"),
    middleName: z.string().optional().describe("Patient middle name"),
    dateOfBirth: z.string().optional().describe("Date of birth (YYYY-MM-DD)"),
    sex: z.string().optional().describe("Patient sex (Male/Female)"),
    addressLine1: z.string().optional().describe("Address line 1"),
    addressLine2: z.string().optional().describe("Address line 2"),
    cityOrTownship: z.string().optional().describe("City or township"),
    stateOrProvince: z.string().optional().describe("State or province"),
    postalCode: z.string().optional().describe("Postal code"),
    country: z.string().optional().describe("Country"),
    homePhoneNumber: z.string().optional().describe("Home phone number"),
    workPhoneNumber: z.string().optional().describe("Work phone number"),
    maritalStatus: z.string().optional().describe("Marital status"),
    race: z.string().optional().describe("Race"),
    religion: z.string().optional().describe("Religion"),
    occupation: z.string().optional().describe("Occupation"),
    medicalAlerts: z.string().optional().describe("Medical alerts"),
    contrastAllergies: z.string().optional().describe("Contrast allergies"),
}, async ({ patientId1, firstName, lastName, middleName, dateOfBirth, sex, addressLine1, addressLine2, cityOrTownship, stateOrProvince, postalCode, country, homePhoneNumber, workPhoneNumber, maritalStatus, race, religion, occupation, medicalAlerts, contrastAllergies }) => {
    try {
        // Format request according to UpdatePatientRequest
        const requestData = formatAriaRequest("UpdatePatientRequest", {
            PatientId1: patientId1,
            FirstName: firstName || "",
            LastName: lastName || "",
            MiddleName: middleName || "",
            Birthdate: dateOfBirth || "",
            Sex: sex || "",
            AddressLine1: addressLine1 || "",
            AddressLine2: addressLine2 || "",
            CityorTownship: cityOrTownship || "",
            StateOrProvince: stateOrProvince || "",
            PostalCode: postalCode || "",
            Country: country || "United States",
            HomePhoneNumber: homePhoneNumber || "",
            WorkPhoneNumber: workPhoneNumber || "",
            MaritalStatus: maritalStatus || "",
            Race: race || "",
            Religion: religion || "",
            Occupation: occupation || "",
            MedicalAlerts: medicalAlerts || "",
            ContrastAllergies: contrastAllergies || "",
            AreaName: "Caller Application Name",
            IsTimeStampCheckRequired: false,
            TimeStamp: null,
            Attributes: null
        });
        const result = await makeAriaRequest("/Gateway/Service.svc/rest/Process", requestData);
        if (result && result.success !== false) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Patient updated successfully!\nPatient ID: ${patientId1}`,
                    },
                ],
            };
        }
        else {
            return {
                content: [
                    {
                        type: "text",
                        text: `Failed to update patient: ${result?.errorMessage || "Unknown error"}`,
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
                    text: `Error updating patient: ${error instanceof Error ? error.message : "Unknown error"}`,
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
// Create Doctor tool
server.tool("create-doctor", "Create a new doctor in ARIA", {
    doctorId: z.string().describe("Doctor ID"),
    firstName: z.string().describe("Doctor first name"),
    lastName: z.string().describe("Doctor last name"),
    middleName: z.string().optional().describe("Doctor middle name"),
    displayName: z.string().describe("Display name"),
    honorific: z.string().optional().describe("Honorific (e.g., DR)"),
    nameSuffix: z.string().optional().describe("Name suffix"),
    specialty: z.string().describe("Medical specialty"),
    isOncologist: z.boolean().optional().describe("Is oncologist"),
    institution: z.string().optional().describe("Institution"),
    location: z.string().optional().describe("Location"),
    phoneNumber1: z.string().optional().describe("Primary phone number"),
    phoneNumber2: z.string().optional().describe("Secondary phone number"),
    faxNumber: z.string().optional().describe("Fax number"),
    addressLine1: z.string().optional().describe("Address line 1"),
    addressLine2: z.string().optional().describe("Address line 2"),
    addressLine3: z.string().optional().describe("Address line 3"),
    cityOrTownship: z.string().optional().describe("City or township"),
    stateOrProvince: z.string().optional().describe("State or province"),
    postalCode: z.string().optional().describe("Postal code"),
    country: z.string().optional().describe("Country"),
    county: z.string().optional().describe("County"),
    originationDate: z.string().optional().describe("Origination date (YYYY-MM-DD)"),
    terminationDate: z.string().optional().describe("Termination date (YYYY-MM-DD)"),
    comment: z.string().optional().describe("Comment"),
    addressComment: z.string().optional().describe("Address comment"),
    pocName: z.string().optional().describe("Point of contact name"),
    billingServiceId: z.string().optional().describe("Billing service ID"),
}, async ({ doctorId, firstName, lastName, middleName, displayName, honorific, nameSuffix, specialty, isOncologist, institution, location, phoneNumber1, phoneNumber2, faxNumber, addressLine1, addressLine2, addressLine3, cityOrTownship, stateOrProvince, postalCode, country, county, originationDate, terminationDate, comment, addressComment, pocName, billingServiceId }) => {
    try {
        // Format request according to CreateDoctorRequest
        const requestData = formatAriaRequest("CreateDoctorRequest", {
            DoctorId: doctorId,
            FirstName: firstName,
            LastName: lastName,
            MiddleName: middleName || "",
            DisplayName: displayName,
            Honorific: honorific || "DR",
            NameSuffix: nameSuffix || "",
            Specialty: specialty,
            IsOncologist: isOncologist || true,
            Institution: institution || "Oncology",
            Location: location || "Life Core Hospital",
            PhoneNumber1: phoneNumber1 || "",
            PhoneNumber2: phoneNumber2 || "",
            FaxNumber: faxNumber || "",
            AddressLine1: addressLine1 || "",
            AddressLine2: addressLine2 || "",
            AddressLine3: addressLine3 || "",
            CityOrTownship: cityOrTownship || "",
            StateOrProvince: stateOrProvince || "United States",
            PostalCode: postalCode || "",
            Country: country || "United States",
            County: county || "",
            OriginationDate: originationDate || new Date().toISOString().split('T')[0],
            TerminationDate: terminationDate || "",
            Comment: comment || "",
            AddressComment: addressComment || "",
            POCName: pocName || "",
            BillingServiceID: billingServiceId || "",
            AreaName: "Caller Application Name",
            Attributes: null
        });
        const result = await makeAriaRequest("/Gateway/Service.svc/rest/Process", requestData);
        if (result && result.success !== false) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Doctor created successfully!\nDoctor ID: ${doctorId}\nName: ${honorific || "DR"} ${firstName} ${lastName}\nSpecialty: ${specialty}`,
                    },
                ],
            };
        }
        else {
            return {
                content: [
                    {
                        type: "text",
                        text: `Failed to create doctor: ${result?.errorMessage || "Unknown error"}`,
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
                    text: `Error creating doctor: ${error instanceof Error ? error.message : "Unknown error"}`,
                },
            ],
        };
    }
});
// Get Doctor Info tool
server.tool("get-doctor-info", "Get doctor information", {
    doctorId: z.string().optional().describe("Doctor ID"),
    departmentId: z.string().optional().describe("Department ID"),
}, async ({ doctorId, departmentId }) => {
    try {
        // Format request according to GetDoctorsInfoRequest
        const requestData = formatAriaRequest("GetDoctorsInfoRequest", {
            DoctorId: doctorId || "",
            DepartmentID: departmentId || "",
            Attributes: null
        });
        const doctors = await makeAriaRequest("/Gateway/Service.svc/rest/Process", requestData);
        if (!doctors || doctors.length === 0) {
            return {
                content: [
                    {
                        type: "text",
                        text: "No doctors found matching the provided criteria.",
                    },
                ],
            };
        }
        const formattedDoctors = doctors.map(doctor => `
Doctor ID: ${doctor.doctorId || doctor.DoctorId?.Value || "N/A"}
Name: ${doctor.honorific || doctor.Honorific?.Value || ""} ${doctor.firstName || doctor.FirstName?.Value || ""} ${doctor.lastName || doctor.LastName?.Value || ""}
Display Name: ${doctor.displayName || doctor.DisplayName?.Value || "N/A"}
Specialty: ${doctor.specialty || doctor.Specialty?.Value || "N/A"}
Institution: ${doctor.institution || doctor.Institution?.Value || "N/A"}
Location: ${doctor.location || doctor.Location?.Value || "N/A"}
Phone: ${doctor.phoneNumber1 || doctor.PhoneNumber1?.Value || "N/A"}
Fax: ${doctor.faxNumber || doctor.FaxNumber?.Value || "N/A"}
Is Oncologist: ${doctor.isOncologist || doctor.IsOncologist?.Value ? "Yes" : "No"}
---`).join("\n");
        return {
            content: [
                {
                    type: "text",
                    text: `Found ${doctors.length} doctor(s):\n${formattedDoctors}`,
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error retrieving doctor information: ${error instanceof Error ? error.message : "Unknown error"}`,
                },
            ],
        };
    }
});
// Assign Doctor to Patient tool
server.tool("assign-doctor-to-patient", "Assign a doctor to a patient", {
    patientId: z.string().describe("Patient ID"),
    doctorId: z.string().describe("Doctor ID"),
    isOncologist: z.boolean().optional().describe("Is oncologist"),
    isPrimary: z.boolean().optional().describe("Is primary doctor"),
    comment: z.string().optional().describe("Comment"),
}, async ({ patientId, doctorId, isOncologist, isPrimary, comment }) => {
    try {
        // Format request according to AssignDoctorToPatientRequest
        const requestData = formatAriaRequest("AssignDoctorToPatientRequest", {
            PatientId: patientId,
            DoctorId: doctorId,
            IsOncologist: isOncologist || true,
            IsPrimary: isPrimary || true,
            Comment: comment || "",
            AreaName: "Caller Application Name",
            Attributes: null
        });
        const result = await makeAriaRequest("/Gateway/Service.svc/rest/Process", requestData);
        if (result && result.success !== false) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Doctor assigned to patient successfully!\nPatient ID: ${patientId}\nDoctor ID: ${doctorId}`,
                    },
                ],
            };
        }
        else {
            return {
                content: [
                    {
                        type: "text",
                        text: `Failed to assign doctor to patient: ${result?.errorMessage || "Unknown error"}`,
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
                    text: `Error assigning doctor to patient: ${error instanceof Error ? error.message : "Unknown error"}`,
                },
            ],
        };
    }
});
// Get Doctors Assigned to Patient tool
server.tool("get-doctors-assigned-to-patient", "Get doctors assigned to a patient", {
    patientId: z.string().describe("Patient ID"),
    isOncologist: z.boolean().optional().describe("Filter by oncologist status"),
}, async ({ patientId, isOncologist }) => {
    try {
        // Format request according to GetDoctorsAssignedToPatientRequest
        const requestData = formatAriaRequest("GetDoctorsAssignedToPatientRequest", {
            PatientId: patientId,
            IsOncologist: isOncologist !== undefined ? isOncologist : null,
            Attributes: null
        });
        const doctors = await makeAriaRequest("/Gateway/Service.svc/rest/Process", requestData);
        if (!doctors || doctors.length === 0) {
            return {
                content: [
                    {
                        type: "text",
                        text: "No doctors found assigned to this patient.",
                    },
                ],
            };
        }
        const formattedDoctors = doctors.map(doctor => `
Doctor ID: ${doctor.doctorId || doctor.DoctorId?.Value || "N/A"}
Name: ${doctor.honorific || doctor.Honorific?.Value || ""} ${doctor.firstName || doctor.FirstName?.Value || ""} ${doctor.lastName || doctor.LastName?.Value || ""}
Specialty: ${doctor.specialty || doctor.Specialty?.Value || "N/A"}
Is Oncologist: ${doctor.isOncologist || doctor.IsOncologist?.Value ? "Yes" : "No"}
Is Primary: ${doctor.isPrimary || doctor.IsPrimary?.Value ? "Yes" : "No"}
Comment: ${doctor.comment || doctor.Comment?.Value || "N/A"}
---`).join("\n");
        return {
            content: [
                {
                    type: "text",
                    text: `Found ${doctors.length} doctor(s) assigned to patient:\n${formattedDoctors}`,
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error retrieving assigned doctors: ${error instanceof Error ? error.message : "Unknown error"}`,
                },
            ],
        };
    }
});
// Get Machine List tool
server.tool("get-machine-list", "Get list of available machines", {}, async () => {
    try {
        // Format request according to GetMachineListRequest
        const requestData = formatAriaRequest("GetMachineListRequest", {
            Attributes: null
        });
        const machines = await makeAriaRequest("/Gateway/Service.svc/rest/Process", requestData);
        if (!machines || machines.length === 0) {
            return {
                content: [
                    {
                        type: "text",
                        text: "No machines found.",
                    },
                ],
            };
        }
        const formattedMachines = machines.map(machine => `
Machine ID: ${machine.machineId || machine.MachineId?.Value || "N/A"}
Machine Name: ${machine.machineName || machine.MachineName?.Value || "N/A"}
Machine Type: ${machine.machineType || machine.MachineType?.Value || "N/A"}
Status: ${machine.status || machine.Status?.Value || "N/A"}
Location: ${machine.location || machine.Location?.Value || "N/A"}
---`).join("\n");
        return {
            content: [
                {
                    type: "text",
                    text: `Found ${machines.length} machine(s):\n${formattedMachines}`,
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error retrieving machine list: ${error instanceof Error ? error.message : "Unknown error"}`,
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
        // Format request according to GetPatientDiagnosesRequest
        const requestData = formatAriaRequest("GetPatientDiagnosesRequest", {
            PatientId: patientId,
            PatientDiagnosisId: diagnosisId || null,
            Attributes: null
        });
        const diagnoses = await makeAriaRequest("/Gateway/Service.svc/rest/Process", requestData);
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
Diagnosis ID: ${diagnosis.patientDiagnosisId || diagnosis.PatientDiagnosisId?.Value || "N/A"}
Primary Site: ${diagnosis.diagnosisSiteId || diagnosis.DiagnosisSiteId?.Value || "N/A"}
Histology: ${diagnosis.behaviorCode || diagnosis.BehaviorCode?.Value || "N/A"}
Stage: ${diagnosis.staging?.[0]?.cancerStageCode || diagnosis.Staging?.[0]?.CancerStageCode?.Value || "N/A"}
Date: ${diagnosis.diagnosisDate || diagnosis.DiagnosisDate?.Value || "N/A"}
Status: ${diagnosis.diagnosisStatusId || diagnosis.DiagnosisStatusId?.Value || "N/A"}
Clinical Description: ${diagnosis.clinicalDescription || diagnosis.ClinicalDescription?.Value || "N/A"}
Diagnosis Code: ${diagnosis.diagnosisCode || diagnosis.DiagnosisCode?.Value || "N/A"}
Is Confirmed: ${diagnosis.isConfirmed || diagnosis.IsConfirmed?.Value ? "Yes" : "No"}
Is Historic: ${diagnosis.isHistoric || diagnosis.IsHistoric?.Value ? "Yes" : "No"}
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
// Create Patient Diagnosis tool
server.tool("create-patient-diagnosis", "Create a new patient diagnosis in ARIA", {
    patientId: z.string().describe("Patient ID"),
    diagnosisCode: z.string().describe("Diagnosis code (e.g., 140.1)"),
    clinicalDescription: z.string().describe("Clinical description"),
    diagnosisDate: z.string().describe("Diagnosis date (YYYY-MM-DD)"),
    diagnosisSiteId: z.number().describe("Diagnosis site ID"),
    behaviorCode: z.string().optional().describe("Behavior code (e.g., 0)"),
    diagnosisScheme: z.number().optional().describe("Diagnosis scheme (e.g., 19)"),
    diagnosisMethodId: z.number().optional().describe("Diagnosis method ID"),
    diagnosisStatusId: z.number().optional().describe("Diagnosis status ID"),
    ranking: z.number().optional().describe("Ranking"),
    isConfirmed: z.boolean().optional().describe("Is confirmed"),
    isHistoric: z.boolean().optional().describe("Is historic"),
    isAdverseEvent: z.boolean().optional().describe("Is adverse event"),
    diagnosisDetails: z.string().optional().describe("Diagnosis details"),
    diagnosisMethodDescription: z.string().optional().describe("Diagnosis method description"),
    areaName: z.string().optional().describe("Area name"),
}, async ({ patientId, diagnosisCode, clinicalDescription, diagnosisDate, diagnosisSiteId, behaviorCode, diagnosisScheme, diagnosisMethodId, diagnosisStatusId, ranking, isConfirmed, isHistoric, isAdverseEvent, diagnosisDetails, diagnosisMethodDescription, areaName }) => {
    try {
        // Format request according to CreatePatientDiagnosisRequest
        const requestData = formatAriaRequest("CreatePatientDiagnosisRequest", {
            PatientDiagnosis: {
                PatientId: { Value: patientId },
                DiagnosisCode: { Value: diagnosisCode },
                ClinicalDescription: { Value: clinicalDescription },
                DiagnosisCodeDescription: { Value: clinicalDescription },
                DiagnosisDate: { Value: diagnosisDate },
                DiagnosisSiteId: { Value: diagnosisSiteId },
                BehaviorCode: { Value: behaviorCode || "0" },
                DiagnosisScheme: { Value: diagnosisScheme || 19 },
                DiagnosisMethodId: { Value: diagnosisMethodId || 1 },
                DiagnosisStatusId: { Value: diagnosisStatusId || 6 },
                DiagnosisStatusDate: { Value: diagnosisDate },
                Ranking: { Value: ranking || 1 },
                IsConfirmed: { Value: isConfirmed || false },
                IsHistoric: { Value: isHistoric || false },
                IsAdverseEvent: { Value: isAdverseEvent || false },
                IsValidEntry: { Value: true },
                DiagnosisDetails: { Value: diagnosisDetails || "DiagnosisDetails" },
                DiagnosisMethodDescription: { Value: diagnosisMethodDescription || "DiagnosisMethodDescription" },
                AreaName: { Value: areaName || "CreateDiag" },
                EvolvedDate: { Value: diagnosisDate },
                EvolvedFromPatientDiagnosisId: { Value: 0 },
                PrimaryPatientDiagnosisId: { Value: 0 },
                PatientDiagnosisId: { Value: null },
                IsICDCodeReported: { Value: false },
                IsMetastasized: { Value: null },
                PrimaryCancerSiteId: { Value: null },
                ErrorReasonDescription: { Value: "The cancer code for this diagnosis was Unchanged." },
                Staging: []
            },
            Attributes: null
        });
        const result = await makeAriaRequest("/Gateway/Service.svc/rest/Process", requestData);
        if (result && result.success !== false) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Patient diagnosis created successfully!\nPatient ID: ${patientId}\nDiagnosis Code: ${diagnosisCode}\nClinical Description: ${clinicalDescription}`,
                    },
                ],
            };
        }
        else {
            return {
                content: [
                    {
                        type: "text",
                        text: `Failed to create patient diagnosis: ${result?.errorMessage || "Unknown error"}`,
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
                    text: `Error creating patient diagnosis: ${error instanceof Error ? error.message : "Unknown error"}`,
                },
            ],
        };
    }
});
// Update Patient Diagnosis tool
server.tool("update-patient-diagnosis", "Update an existing patient diagnosis in ARIA", {
    patientDiagnosisId: z.number().describe("Patient diagnosis ID"),
    patientId: z.string().describe("Patient ID"),
    diagnosisCode: z.string().optional().describe("Diagnosis code (e.g., 140.1)"),
    clinicalDescription: z.string().optional().describe("Clinical description"),
    diagnosisDate: z.string().optional().describe("Diagnosis date (YYYY-MM-DD)"),
    diagnosisSiteId: z.number().optional().describe("Diagnosis site ID"),
    behaviorCode: z.string().optional().describe("Behavior code (e.g., 0)"),
    diagnosisScheme: z.number().optional().describe("Diagnosis scheme (e.g., 19)"),
    diagnosisMethodId: z.number().optional().describe("Diagnosis method ID"),
    diagnosisStatusId: z.number().optional().describe("Diagnosis status ID"),
    ranking: z.number().optional().describe("Ranking"),
    isConfirmed: z.boolean().optional().describe("Is confirmed"),
    isHistoric: z.boolean().optional().describe("Is historic"),
    isAdverseEvent: z.boolean().optional().describe("Is adverse event"),
    diagnosisDetails: z.string().optional().describe("Diagnosis details"),
    diagnosisMethodDescription: z.string().optional().describe("Diagnosis method description"),
    areaName: z.string().optional().describe("Area name"),
}, async ({ patientDiagnosisId, patientId, diagnosisCode, clinicalDescription, diagnosisDate, diagnosisSiteId, behaviorCode, diagnosisScheme, diagnosisMethodId, diagnosisStatusId, ranking, isConfirmed, isHistoric, isAdverseEvent, diagnosisDetails, diagnosisMethodDescription, areaName }) => {
    try {
        // Format request according to UpdatePatientDiagnosisRequest
        const requestData = formatAriaRequest("UpdatePatientDiagnosisRequest", {
            PatientDiagnosis: {
                PatientDiagnosisId: { Value: patientDiagnosisId },
                PatientId: { Value: patientId },
                DiagnosisCode: { Value: diagnosisCode || "" },
                ClinicalDescription: { Value: clinicalDescription || "" },
                DiagnosisCodeDescription: { Value: clinicalDescription || "" },
                DiagnosisDate: { Value: diagnosisDate || "" },
                DiagnosisSiteId: { Value: diagnosisSiteId || 0 },
                BehaviorCode: { Value: behaviorCode || null },
                DiagnosisScheme: { Value: diagnosisScheme || 19 },
                DiagnosisMethodId: { Value: diagnosisMethodId || 1 },
                DiagnosisStatusId: { Value: diagnosisStatusId || 6 },
                DiagnosisStatusDate: { Value: diagnosisDate || "" },
                Ranking: { Value: ranking || 1 },
                IsConfirmed: { Value: isConfirmed || false },
                IsHistoric: { Value: isHistoric || false },
                IsAdverseEvent: { Value: isAdverseEvent || false },
                IsValidEntry: { Value: true },
                DiagnosisDetails: { Value: diagnosisDetails || "DiagnosisDetails" },
                DiagnosisMethodDescription: { Value: diagnosisMethodDescription || "DiagnosisMethodDescription" },
                AreaName: { Value: areaName || "CreateDiag" },
                EvolvedDate: { Value: diagnosisDate || "" },
                EvolvedFromPatientDiagnosisId: { Value: 0 },
                PrimaryPatientDiagnosisId: { Value: 0 },
                IsICDCodeReported: { Value: false },
                IsMetastasized: { Value: null },
                PrimaryCancerSiteId: { Value: null },
                ErrorReasonDescription: { Value: "The cancer code for this diagnosis was Unchanged." },
                Staging: []
            },
            Attributes: null
        });
        const result = await makeAriaRequest("/Gateway/Service.svc/rest/Process", requestData);
        if (result && result.success !== false) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Patient diagnosis updated successfully!\nPatient Diagnosis ID: ${patientDiagnosisId}\nPatient ID: ${patientId}`,
                    },
                ],
            };
        }
        else {
            return {
                content: [
                    {
                        type: "text",
                        text: `Failed to update patient diagnosis: ${result?.errorMessage || "Unknown error"}`,
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
                    text: `Error updating patient diagnosis: ${error instanceof Error ? error.message : "Unknown error"}`,
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
// Create Machine Appointment tool
server.tool("create-machine-appointment", "Create a new machine appointment in ARIA", {
    patientId: z.string().describe("Patient ID"),
    machineId: z.string().describe("Machine ID"),
    startDateTime: z.string().describe("Start date and time (ISO format)"),
    endDateTime: z.string().describe("End date and time (ISO format)"),
    activityName: z.string().describe("Activity name (e.g., Daily Treatment)"),
    activityStatus: z.string().optional().describe("Activity status (e.g., Open)"),
    activityNote: z.string().optional().describe("Activity note"),
    departmentName: z.string().optional().describe("Department name"),
    hospitalName: z.string().optional().describe("Hospital name"),
    resourceType: z.string().optional().describe("Resource type (e.g., Machine)"),
    areaName: z.string().optional().describe("Area name"),
    associatedResources: z.array(z.object({
        resourceId: z.string(),
        resourceType: z.string()
    })).optional().describe("Associated resources"),
}, async ({ patientId, machineId, startDateTime, endDateTime, activityName, activityStatus, activityNote, departmentName, hospitalName, resourceType, areaName, associatedResources }) => {
    try {
        // Format request according to CreateMachineAppointmentRequest
        const requestData = formatAriaRequest("CreateMachineAppointmentRequest", {
            PatientId: { Value: patientId },
            MachineId: { Value: machineId },
            StartDateTime: { Value: startDateTime },
            EndDateTime: { Value: endDateTime },
            ActivityName: { Value: activityName },
            ActivityStatus: { Value: activityStatus || "Open" },
            ActivityNote: { Value: activityNote || "Note" },
            DepartmentName: { Value: departmentName || "Oncology11" },
            HospitalName: { Value: hospitalName || "AA_Hospital_1" },
            ResourceType: { Value: resourceType || "Machine" },
            AreaName: { Value: areaName || "AreaName" },
            AssociatedResources: associatedResources ? associatedResources.map(resource => ({
                ResourceID: { Value: resource.resourceId },
                ResourceType: { Value: resource.resourceType }
            })) : [],
            Attributes: null
        });
        const result = await makeAriaRequest("/Gateway/Service.svc/rest/Process", requestData);
        if (result && result.success !== false) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Machine appointment created successfully!\nPatient ID: ${patientId}\nMachine ID: ${machineId}\nActivity: ${activityName}\nStart: ${startDateTime}\nEnd: ${endDateTime}`,
                    },
                ],
            };
        }
        else {
            return {
                content: [
                    {
                        type: "text",
                        text: `Failed to create machine appointment: ${result?.errorMessage || "Unknown error"}`,
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
                    text: `Error creating machine appointment: ${error instanceof Error ? error.message : "Unknown error"}`,
                },
            ],
        };
    }
});
// Update Machine Appointment tool
server.tool("update-machine-appointment", "Update an existing machine appointment in ARIA", {
    patientId: z.string().describe("Patient ID"),
    machineId: z.string().describe("Machine ID"),
    startDateTime: z.string().describe("Current start date and time (ISO format)"),
    endDateTime: z.string().describe("Current end date and time (ISO format)"),
    newStartDateTime: z.string().describe("New start date and time (ISO format)"),
    newEndDateTime: z.string().describe("New end date and time (ISO format)"),
    activityName: z.string().describe("Activity name (e.g., Daily Treatment)"),
    activityStatus: z.string().optional().describe("Activity status (e.g., Open)"),
    activityNote: z.string().optional().describe("Activity note"),
    departmentName: z.string().optional().describe("Department name"),
    hospitalName: z.string().optional().describe("Hospital name"),
    resourceType: z.string().optional().describe("Resource type (e.g., Machine)"),
    areaName: z.string().optional().describe("Area name"),
    associatedResources: z.array(z.object({
        resourceId: z.string(),
        resourceType: z.string()
    })).optional().describe("Associated resources"),
    isTimeStampCheckRequired: z.boolean().optional().describe("Is timestamp check required"),
    timeStamp: z.string().optional().describe("Timestamp"),
}, async ({ patientId, machineId, startDateTime, endDateTime, newStartDateTime, newEndDateTime, activityName, activityStatus, activityNote, departmentName, hospitalName, resourceType, areaName, associatedResources, isTimeStampCheckRequired, timeStamp }) => {
    try {
        // Format request according to UpdateMachineAppointmentRequest
        const requestData = formatAriaRequest("UpdateMachineAppointmentRequest", {
            PatientId: { Value: patientId },
            MachineId: { Value: machineId },
            StartDateTime: { Value: startDateTime },
            EndDateTime: { Value: endDateTime },
            NewStartDateTime: { Value: newStartDateTime },
            NewEndDateTime: { Value: newEndDateTime },
            ActivityName: { Value: activityName },
            ActivityStatus: { Value: activityStatus || "Open" },
            ActivityNote: { Value: activityNote || "Note" },
            DepartmentName: { Value: departmentName || "Oncology11" },
            HospitalName: { Value: hospitalName || "AA_Hospital_1" },
            ResourceType: { Value: resourceType || "Machine" },
            AreaName: { Value: areaName || "Caller Application Name" },
            AssociatedResources: associatedResources ? associatedResources.map(resource => ({
                ResourceID: { Value: resource.resourceId },
                ResourceType: { Value: resource.resourceType }
            })) : [],
            IsTimeStampCheckRequired: { Value: isTimeStampCheckRequired || false },
            TimeStamp: { Value: timeStamp || null },
            Attributes: null
        });
        const result = await makeAriaRequest("/Gateway/Service.svc/rest/Process", requestData);
        if (result && result.success !== false) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Machine appointment updated successfully!\nPatient ID: ${patientId}\nMachine ID: ${machineId}\nNew Start: ${newStartDateTime}\nNew End: ${newEndDateTime}`,
                    },
                ],
            };
        }
        else {
            return {
                content: [
                    {
                        type: "text",
                        text: `Failed to update machine appointment: ${result?.errorMessage || "Unknown error"}`,
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
                    text: `Error updating machine appointment: ${error instanceof Error ? error.message : "Unknown error"}`,
                },
            ],
        };
    }
});
// Get Machine Appointments tool
server.tool("get-machine-appointments", "Get machine appointments for a specific time range", {
    machineId: z.string().describe("Machine ID"),
    startDateTime: z.string().describe("Start date and time (ISO format)"),
    endDateTime: z.string().describe("End date and time (ISO format)"),
    departmentName: z.string().optional().describe("Department name"),
    hospitalName: z.string().optional().describe("Hospital name"),
}, async ({ machineId, startDateTime, endDateTime, departmentName, hospitalName }) => {
    try {
        // Format request according to GetMachineAppointmentsRequest
        const requestData = formatAriaRequest("GetMachineAppointmentsRequest", {
            MachineId: { Value: machineId },
            StartDateTime: { Value: startDateTime },
            EndDateTime: { Value: endDateTime },
            DepartmentName: { Value: departmentName || "Oncology11" },
            HospitalName: { Value: hospitalName || "AA_Hospital_1" },
            Attributes: null
        });
        const appointments = await makeAriaRequest("/Gateway/Service.svc/rest/Process", requestData);
        if (!appointments || appointments.length === 0) {
            return {
                content: [
                    {
                        type: "text",
                        text: "No machine appointments found for the specified time range.",
                    },
                ],
            };
        }
        const formattedAppointments = appointments.map(appointment => `
Appointment ID: ${appointment.appointmentId || appointment.AppointmentId?.Value || "N/A"}
Patient ID: ${appointment.patientId || appointment.PatientId?.Value || "N/A"}
Machine ID: ${appointment.machineId || appointment.MachineId?.Value || "N/A"}
Start Time: ${appointment.startDateTime || appointment.StartDateTime?.Value || "N/A"}
End Time: ${appointment.endDateTime || appointment.EndDateTime?.Value || "N/A"}
Activity Name: ${appointment.activityName || appointment.ActivityName?.Value || "N/A"}
Activity Status: ${appointment.activityStatus || appointment.ActivityStatus?.Value || "N/A"}
Activity Note: ${appointment.activityNote || appointment.ActivityNote?.Value || "N/A"}
Department: ${appointment.departmentName || appointment.DepartmentName?.Value || "N/A"}
---`).join("\n");
        return {
            content: [
                {
                    type: "text",
                    text: `Found ${appointments.length} machine appointment(s):\n${formattedAppointments}`,
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error retrieving machine appointments: ${error instanceof Error ? error.message : "Unknown error"}`,
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
// Get Billing Info tool
server.tool("get-billing-info", "Get billing information for a date range", {
    startDate: z.string().describe("Start date (YYYY-MM-DD)"),
    endDate: z.string().describe("End date (YYYY-MM-DD)"),
    hospitalName: z.string().optional().describe("Hospital name"),
    returnAllCharges: z.boolean().optional().describe("Return all charges"),
    sortMode: z.number().optional().describe("Sort mode (e.g., 2)"),
}, async ({ startDate, endDate, hospitalName, returnAllCharges, sortMode }) => {
    try {
        // Format request according to GetBillingInfoRequest
        const requestData = formatAriaRequest("GetBillingInfoRequest", {
            StartDate: { Value: startDate },
            EndDate: { Value: endDate },
            HospitalName: { Value: hospitalName || "AA_Hospital_1" },
            ReturnAllCharges: { Value: returnAllCharges || true },
            SortMode: { Value: sortMode || 2 },
            Attributes: null
        });
        const billingInfo = await makeAriaRequest("/Gateway/Service.svc/rest/Process", requestData);
        if (!billingInfo || billingInfo.length === 0) {
            return {
                content: [
                    {
                        type: "text",
                        text: "No billing information found for the specified date range.",
                    },
                ],
            };
        }
        const formattedBillingInfo = billingInfo.map(bill => `
Billing ID: ${bill.billingId || bill.BillingId?.Value || "N/A"}
Patient ID: ${bill.patientId || bill.PatientId?.Value || "N/A"}
Patient Name: ${bill.patientName || bill.PatientName?.Value || "N/A"}
Service Date: ${bill.serviceDate || bill.ServiceDate?.Value || "N/A"}
Charge Amount: $${bill.chargeAmount || bill.ChargeAmount?.Value || "0.00"}
Procedure Code: ${bill.procedureCode || bill.ProcedureCode?.Value || "N/A"}
Procedure Description: ${bill.procedureDescription || bill.ProcedureDescription?.Value || "N/A"}
Insurance Provider: ${bill.insuranceProvider || bill.InsuranceProvider?.Value || "N/A"}
Billing Status: ${bill.billingStatus || bill.BillingStatus?.Value || "N/A"}
Department: ${bill.department || bill.Department?.Value || "N/A"}
Provider: ${bill.provider || bill.Provider?.Value || "N/A"}
---`).join("\n");
        return {
            content: [
                {
                    type: "text",
                    text: `Found ${billingInfo.length} billing record(s):\n${formattedBillingInfo}`,
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error retrieving billing information: ${error instanceof Error ? error.message : "Unknown error"}`,
                },
            ],
        };
    }
});
// Acknowledge Billing Info Received tool
server.tool("acknowledge-billing-info-received", "Acknowledge that billing information has been received", {
    exportAcknowledgeDate: z.string().describe("Export acknowledge date (YYYY-MM-DD)"),
    tsaSerialNumber: z.number().describe("TSA Serial Number"),
}, async ({ exportAcknowledgeDate, tsaSerialNumber }) => {
    try {
        // Format request according to AcknowledgeBillingInfoReceivedRequest
        const requestData = formatAriaRequest("AcknowledgeBillingInfoReceivedRequest", {
            ExportAcknowledgeDate: { Value: exportAcknowledgeDate },
            TSASerialNumber: { Value: tsaSerialNumber },
            Attributes: null
        });
        const result = await makeAriaRequest("/Gateway/Service.svc/rest/Process", requestData);
        if (result && result.success !== false) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Billing information acknowledgment successful!\nExport Acknowledge Date: ${exportAcknowledgeDate}\nTSA Serial Number: ${tsaSerialNumber}`,
                    },
                ],
            };
        }
        else {
            return {
                content: [
                    {
                        type: "text",
                        text: `Failed to acknowledge billing information: ${result?.errorMessage || "Unknown error"}`,
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
                    text: `Error acknowledging billing information: ${error instanceof Error ? error.message : "Unknown error"}`,
                },
            ],
        };
    }
});
// Radiation Therapy Data tools
server.tool("get-radiation-courses", "Get radiation therapy courses and plan setups for a patient", {
    patientId: z.string().describe("Patient ID"),
    treatmentType: z.string().optional().describe("Treatment Type (e.g., Linac)"),
}, async ({ patientId, treatmentType }) => {
    try {
        // Format request according to GetPatientCoursesAndPlanSetupsRequest
        const requestData = formatAriaRequest("GetPatientCoursesAndPlanSetupsRequest", {
            PatientId: patientId,
            TreatmentType: treatmentType || "Linac"
        });
        const courses = await makeAriaRequest("/Gateway/Service.svc/rest/Process", requestData);
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
Course ID: ${course.courseId || course.CourseId?.Value || "N/A"}
Course Name: ${course.courseName || course.CourseName?.Value || "N/A"}
Start Date: ${course.startDate || course.StartDate?.Value || "N/A"}
End Date: ${course.endDate || course.EndDate?.Value || "N/A"}
Status: ${course.status || course.Status?.Value || "N/A"}
Total Fractions: ${course.totalFractions || course.TotalFractions?.Value || "N/A"}
Completed Fractions: ${course.completedFractions || course.CompletedFractions?.Value || "N/A"}
Prescription Dose: ${course.prescriptionDose || course.PrescriptionDose?.Value || "N/A"} ${course.doseUnit || course.DoseUnit?.Value || ""}
Target Volume: ${course.targetVolume || course.TargetVolume?.Value || "N/A"}
Treatment Type: ${course.treatmentType || course.TreatmentType?.Value || "N/A"}
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
server.tool("get-treatment-plans", "Get radiation treatment plans for a patient", {
    patientId: z.string().describe("Patient ID"),
    courseId: z.string().optional().describe("Course ID"),
    planSetupId: z.string().optional().describe("Plan Setup ID"),
}, async ({ patientId, courseId, planSetupId }) => {
    try {
        // Format request according to GetPatientPlansRequest
        const requestData = formatAriaRequest("GetPatientPlansRequest", {
            PatientId: patientId,
            CourseId: courseId || "",
            PlanSetupId: planSetupId || ""
        });
        const plans = await makeAriaRequest("/Gateway/Service.svc/rest/Process", requestData);
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
Plan ID: ${plan.planId || plan.PlanId?.Value || "N/A"}
Plan Name: ${plan.planName || plan.PlanName?.Value || "N/A"}
Course ID: ${plan.courseId || plan.CourseId?.Value || "N/A"}
Plan Type: ${plan.planType || plan.PlanType?.Value || "N/A"}
Status: ${plan.status || plan.Status?.Value || "N/A"}
Created Date: ${plan.createdDate || plan.CreatedDate?.Value || "N/A"}
Approved Date: ${plan.approvedDate || plan.ApprovedDate?.Value || "Not approved"}
Total Dose: ${plan.totalDose || plan.TotalDose?.Value || "N/A"} ${plan.doseUnit || plan.DoseUnit?.Value || ""}
Fractions: ${plan.fractions || plan.Fractions?.Value || "N/A"}
Beam Count: ${plan.beamCount || plan.BeamCount?.Value || "N/A"}
Plan Setup ID: ${plan.planSetupId || plan.PlanSetupId?.Value || "N/A"}
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
server.tool("get-plan-setups", "Get radiation treatment plan setups for a patient", {
    patientId: z.string().describe("Patient ID"),
    courseId: z.string().optional().describe("Course ID"),
    planSetupId: z.string().optional().describe("Plan Setup ID"),
}, async ({ patientId, courseId, planSetupId }) => {
    try {
        // Format request according to GetPatientPlanSetupsRequest
        const requestData = formatAriaRequest("GetPatientPlanSetupsRequest", {
            PatientId: patientId,
            CourseId: courseId || "",
            PlanSetUpId: planSetupId || ""
        });
        const planSetups = await makeAriaRequest("/Gateway/Service.svc/rest/Process", requestData);
        if (!planSetups || planSetups.length === 0) {
            return {
                content: [
                    {
                        type: "text",
                        text: "No plan setups found for this patient.",
                    },
                ],
            };
        }
        const formattedPlanSetups = planSetups.map(setup => `
Plan Setup ID: ${setup.planSetupId || setup.PlanSetUpId?.Value || "N/A"}
Plan Setup Name: ${setup.planSetupName || setup.PlanSetupName?.Value || "N/A"}
Course ID: ${setup.courseId || setup.CourseId?.Value || "N/A"}
Patient ID: ${setup.patientId || setup.PatientId?.Value || "N/A"}
Status: ${setup.status || setup.Status?.Value || "N/A"}
Created Date: ${setup.createdDate || setup.CreatedDate?.Value || "N/A"}
Approved Date: ${setup.approvedDate || setup.ApprovedDate?.Value || "Not approved"}
Total Dose: ${setup.totalDose || setup.TotalDose?.Value || "N/A"} ${setup.doseUnit || setup.DoseUnit?.Value || ""}
Fractions: ${setup.fractions || setup.Fractions?.Value || "N/A"}
---`).join("\n");
        return {
            content: [
                {
                    type: "text",
                    text: `Found ${planSetups.length} plan setup(s):\n${formattedPlanSetups}`,
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error retrieving plan setups: ${error instanceof Error ? error.message : "Unknown error"}`,
                },
            ],
        };
    }
});
server.tool("get-plan-tx-fields", "Get radiation treatment plan treatment fields", {
    patientId: z.string().describe("Patient ID"),
    courseId: z.string().describe("Course ID"),
    planId: z.string().describe("Plan ID"),
    scale: z.string().optional().describe("Scale (e.g., IEC)"),
}, async ({ patientId, courseId, planId, scale }) => {
    try {
        // Format request according to GetPatientPlanTxFieldsRequest
        const requestData = formatAriaRequest("GetPatientPlanTxFieldsRequest", {
            PatientId: patientId,
            CourseId: courseId,
            PlanId: planId,
            Scale: scale || "IEC"
        });
        const txFields = await makeAriaRequest("/Gateway/Service.svc/rest/Process", requestData);
        if (!txFields || txFields.length === 0) {
            return {
                content: [
                    {
                        type: "text",
                        text: "No treatment fields found for this plan.",
                    },
                ],
            };
        }
        const formattedTxFields = txFields.map(field => `
Field ID: ${field.fieldId || field.FieldId?.Value || "N/A"}
Field Name: ${field.fieldName || field.FieldName?.Value || "N/A"}
Plan ID: ${field.planId || field.PlanId?.Value || "N/A"}
Course ID: ${field.courseId || field.CourseId?.Value || "N/A"}
Field Type: ${field.fieldType || field.FieldType?.Value || "N/A"}
Gantry Angle: ${field.gantryAngle || field.GantryAngle?.Value || "N/A"}
Collimator Angle: ${field.collimatorAngle || field.CollimatorAngle?.Value || "N/A"}
Couch Angle: ${field.couchAngle || field.CouchAngle?.Value || "N/A"}
Dose: ${field.dose || field.Dose?.Value || "N/A"} ${field.doseUnit || field.DoseUnit?.Value || ""}
MU: ${field.mu || field.MU?.Value || "N/A"}
---`).join("\n");
        return {
            content: [
                {
                    type: "text",
                    text: `Found ${txFields.length} treatment field(s):\n${formattedTxFields}`,
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error retrieving treatment fields: ${error instanceof Error ? error.message : "Unknown error"}`,
                },
            ],
        };
    }
});
server.tool("get-fields-treated-info", "Get information about treated fields for a patient", {
    patientId: z.string().describe("Patient ID"),
    courseId: z.string().describe("Course ID"),
    treatmentStartDate: z.string().describe("Treatment start date (YYYY-MM-DD)"),
    treatmentEndDate: z.string().describe("Treatment end date (YYYY-MM-DD)"),
}, async ({ patientId, courseId, treatmentStartDate, treatmentEndDate }) => {
    try {
        // Format request according to GetPatientFieldsTreatedInfoRequest
        const requestData = formatAriaRequest("GetPatientFieldsTreatedInfoRequest", {
            PatientId: patientId,
            CourseId: courseId,
            TreatmentStartDate: treatmentStartDate,
            TreatmentEndDate: treatmentEndDate
        });
        const treatedInfo = await makeAriaRequest("/Gateway/Service.svc/rest/Process", requestData);
        if (!treatedInfo || treatedInfo.length === 0) {
            return {
                content: [
                    {
                        type: "text",
                        text: "No treated field information found for this patient in the specified date range.",
                    },
                ],
            };
        }
        const formattedTreatedInfo = treatedInfo.map(info => `
Field ID: ${info.fieldId || info.FieldId?.Value || "N/A"}
Field Name: ${info.fieldName || info.FieldName?.Value || "N/A"}
Treatment Date: ${info.treatmentDate || info.TreatmentDate?.Value || "N/A"}
Fraction Number: ${info.fractionNumber || info.FractionNumber?.Value || "N/A"}
Dose Delivered: ${info.doseDelivered || info.DoseDelivered?.Value || "N/A"} ${info.doseUnit || info.DoseUnit?.Value || ""}
MU Delivered: ${info.muDelivered || info.MUDelivered?.Value || "N/A"}
Status: ${info.status || info.Status?.Value || "N/A"}
Machine: ${info.machineName || info.MachineName?.Value || "N/A"}
Technologist: ${info.technologistName || info.TechnologistName?.Value || "N/A"}
---`).join("\n");
        return {
            content: [
                {
                    type: "text",
                    text: `Found ${treatedInfo.length} treated field record(s):\n${formattedTreatedInfo}`,
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error retrieving treated field information: ${error instanceof Error ? error.message : "Unknown error"}`,
                },
            ],
        };
    }
});
server.tool("get-patient-ref-points", "Get patient reference points", {
    patientId: z.string().describe("Patient ID"),
}, async ({ patientId }) => {
    try {
        // Format request according to GetPatientRefPointsRequest
        const requestData = formatAriaRequest("GetPatientRefPointsRequest", {
            PatientId: patientId
        });
        const refPoints = await makeAriaRequest("/Gateway/Service.svc/rest/Process", requestData);
        if (!refPoints || refPoints.length === 0) {
            return {
                content: [
                    {
                        type: "text",
                        text: "No reference points found for this patient.",
                    },
                ],
            };
        }
        const formattedRefPoints = refPoints.map(point => `
Reference Point ID: ${point.refPointId || point.RefPointId?.Value || "N/A"}
Reference Point Name: ${point.refPointName || point.RefPointName?.Value || "N/A"}
X Coordinate: ${point.xCoordinate || point.XCoordinate?.Value || "N/A"}
Y Coordinate: ${point.yCoordinate || point.YCoordinate?.Value || "N/A"}
Z Coordinate: ${point.zCoordinate || point.ZCoordinate?.Value || "N/A"}
Description: ${point.description || point.Description?.Value || "N/A"}
---`).join("\n");
        return {
            content: [
                {
                    type: "text",
                    text: `Found ${refPoints.length} reference point(s):\n${formattedRefPoints}`,
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error retrieving reference points: ${error instanceof Error ? error.message : "Unknown error"}`,
                },
            ],
        };
    }
});
server.tool("get-clinical-concepts", "Get patient clinical concepts", {
    patientId: z.string().describe("Patient ID"),
    courseId: z.string().describe("Course ID"),
    prescriptionId: z.string().optional().describe("Prescription ID"),
}, async ({ patientId, courseId, prescriptionId }) => {
    try {
        // Format request according to GetPatientClinicalConceptsRequest
        const requestData = formatAriaRequest("GetPatientClinicalConceptsRequest", {
            PatientId: patientId,
            CourseId: courseId,
            PrescriptionId: prescriptionId || ""
        });
        const clinicalConcepts = await makeAriaRequest("/Gateway/Service.svc/rest/Process", requestData);
        if (!clinicalConcepts || clinicalConcepts.length === 0) {
            return {
                content: [
                    {
                        type: "text",
                        text: "No clinical concepts found for this patient.",
                    },
                ],
            };
        }
        const formattedClinicalConcepts = clinicalConcepts.map(concept => `
Concept ID: ${concept.conceptId || concept.ConceptId?.Value || "N/A"}
Concept Name: ${concept.conceptName || concept.ConceptName?.Value || "N/A"}
Concept Type: ${concept.conceptType || concept.ConceptType?.Value || "N/A"}
Value: ${concept.value || concept.Value?.Value || "N/A"}
Unit: ${concept.unit || concept.Unit?.Value || "N/A"}
Description: ${concept.description || concept.Description?.Value || "N/A"}
---`).join("\n");
        return {
            content: [
                {
                    type: "text",
                    text: `Found ${clinicalConcepts.length} clinical concept(s):\n${formattedClinicalConcepts}`,
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error retrieving clinical concepts: ${error instanceof Error ? error.message : "Unknown error"}`,
                },
            ],
        };
    }
});
// RFID Vendor Connectivity tools
server.tool("get-patient-name-for-id", "Get patient name for a specific ID type", {
    id: z.string().describe("Patient ID (e.g., Social Insurance Number)"),
    idType: z.string().describe("ID Type (e.g., Social Insurance Number)"),
}, async ({ id, idType }) => {
    try {
        // Format request according to GetPatientNameForIDRequest
        const requestData = formatAriaRequest("GetPatientNameForIDRequest", {
            Id: id,
            IdType: idType
        });
        const patientInfo = await makeAriaRequest("/Gateway/Service.svc/rest/Process", requestData);
        if (!patientInfo) {
            return {
                content: [
                    {
                        type: "text",
                        text: "No patient found for the provided ID.",
                    },
                ],
            };
        }
        const formattedPatientInfo = `
Patient ID: ${patientInfo.patientId || patientInfo.PatientId?.Value || "N/A"}
Patient Name: ${patientInfo.patientName || patientInfo.PatientName?.Value || "N/A"}
ID Type: ${patientInfo.idType || patientInfo.IdType?.Value || "N/A"}
ID Value: ${patientInfo.idValue || patientInfo.IdValue?.Value || "N/A"}
---`;
        return {
            content: [
                {
                    type: "text",
                    text: `Patient information:\n${formattedPatientInfo}`,
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error retrieving patient name: ${error instanceof Error ? error.message : "Unknown error"}`,
                },
            ],
        };
    }
});
server.tool("get-resource-details-for-id", "Get resource details for a specific ID type", {
    id: z.string().describe("Resource ID"),
    idType: z.string().describe("ID Type (e.g., RFID)"),
}, async ({ id, idType }) => {
    try {
        // Format request according to GetResourceDetailsForIDRequest
        const requestData = formatAriaRequest("GetResourceDetailsForIDRequest", {
            Id: id,
            IdType: idType
        });
        const resourceInfo = await makeAriaRequest("/Gateway/Service.svc/rest/Process", requestData);
        if (!resourceInfo) {
            return {
                content: [
                    {
                        type: "text",
                        text: "No resource found for the provided ID.",
                    },
                ],
            };
        }
        const formattedResourceInfo = `
Resource ID: ${resourceInfo.resourceId || resourceInfo.ResourceId?.Value || "N/A"}
Resource Name: ${resourceInfo.resourceName || resourceInfo.ResourceName?.Value || "N/A"}
Resource Type: ${resourceInfo.resourceType || resourceInfo.ResourceType?.Value || "N/A"}
ID Type: ${resourceInfo.idType || resourceInfo.IdType?.Value || "N/A"}
Status: ${resourceInfo.status || resourceInfo.Status?.Value || "N/A"}
---`;
        return {
            content: [
                {
                    type: "text",
                    text: `Resource information:\n${formattedResourceInfo}`,
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error retrieving resource details: ${error instanceof Error ? error.message : "Unknown error"}`,
                },
            ],
        };
    }
});
server.tool("get-patient-appointments-for-id", "Get patient appointments for a specific ID type", {
    id: z.string().describe("Patient ID"),
    idType: z.string().describe("ID Type (e.g., Social Insurance Number)"),
    startDateTime: z.string().describe("Start date and time (ISO format)"),
    endDateTime: z.string().describe("End date and time (ISO format)"),
    appointmentStatus: z.string().optional().describe("Appointment status (e.g., All)"),
}, async ({ id, idType, startDateTime, endDateTime, appointmentStatus }) => {
    try {
        // Format request according to GetPatientAppointmentsForIDRequest
        const requestData = formatAriaRequest("GetPatientAppointmentsForIDRequest", {
            Id: id,
            IdType: idType,
            StartDateTime: startDateTime,
            EndDateTime: endDateTime,
            AppointmentStatus: appointmentStatus || "All"
        });
        const appointments = await makeAriaRequest("/Gateway/Service.svc/rest/Process", requestData);
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
Appointment ID: ${appointment.appointmentId || appointment.AppointmentId?.Value || "N/A"}
Date: ${appointment.appointmentDate || appointment.AppointmentDate?.Value || "N/A"}
Time: ${appointment.startTime || appointment.StartTime?.Value || "N/A"} - ${appointment.endTime || appointment.EndTime?.Value || "N/A"}
Type: ${appointment.appointmentType || appointment.AppointmentType?.Value || "N/A"}
Status: ${appointment.status || appointment.Status?.Value || "N/A"}
Resource: ${appointment.resourceName || appointment.ResourceName?.Value || "N/A"}
Provider: ${appointment.providerName || appointment.ProviderName?.Value || "N/A"}
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
// Helper Services tools
server.tool("get-diagnosis-lookup-list", "Get diagnosis lookup list", {
    lookupType: z.string().describe("Lookup type (e.g., DIAGNOSIS_METHOD)"),
    lookupLanguage: z.string().optional().describe("Lookup language (e.g., ENU)"),
}, async ({ lookupType, lookupLanguage }) => {
    try {
        // Format request according to GetDiagnosisLookUpListRequest
        const requestData = formatAriaRequest("GetDiagnosisLookUpListRequest", {
            LookUpType: lookupType,
            LookUpLanguage: lookupLanguage || "ENU"
        });
        const lookupList = await makeAriaRequest("/Gateway/Service.svc/rest/Process", requestData);
        if (!lookupList || lookupList.length === 0) {
            return {
                content: [
                    {
                        type: "text",
                        text: "No lookup items found for the specified type.",
                    },
                ],
            };
        }
        const formattedLookupList = lookupList.map(item => `
Lookup ID: ${item.lookupId || item.LookupId?.Value || "N/A"}
Lookup Name: ${item.lookupName || item.LookupName?.Value || "N/A"}
Lookup Type: ${item.lookupType || item.LookupType?.Value || "N/A"}
Description: ${item.description || item.Description?.Value || "N/A"}
---`).join("\n");
        return {
            content: [
                {
                    type: "text",
                    text: `Found ${lookupList.length} lookup item(s):\n${formattedLookupList}`,
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error retrieving diagnosis lookup list: ${error instanceof Error ? error.message : "Unknown error"}`,
                },
            ],
        };
    }
});
server.tool("get-lookup-list", "Get general lookup list", {
    lookupType: z.string().describe("Lookup type (e.g., MARITAL_STATUS)"),
    lookupLanguage: z.string().optional().describe("Lookup language (e.g., ENU)"),
}, async ({ lookupType, lookupLanguage }) => {
    try {
        // Format request according to GetLookUpListRequest
        const requestData = formatAriaRequest("GetLookUpListRequest", {
            LookUpType: lookupType,
            LookUpLanguage: lookupLanguage || "ENU"
        });
        const lookupList = await makeAriaRequest("/Gateway/Service.svc/rest/Process", requestData);
        if (!lookupList || lookupList.length === 0) {
            return {
                content: [
                    {
                        type: "text",
                        text: "No lookup items found for the specified type.",
                    },
                ],
            };
        }
        const formattedLookupList = lookupList.map(item => `
Lookup ID: ${item.lookupId || item.LookupId?.Value || "N/A"}
Lookup Name: ${item.lookupName || item.LookupName?.Value || "N/A"}
Lookup Type: ${item.lookupType || item.LookupType?.Value || "N/A"}
Description: ${item.description || item.Description?.Value || "N/A"}
---`).join("\n");
        return {
            content: [
                {
                    type: "text",
                    text: `Found ${lookupList.length} lookup item(s):\n${formattedLookupList}`,
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error retrieving lookup list: ${error instanceof Error ? error.message : "Unknown error"}`,
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
