# ARIA Access MCP Server

A Model Context Protocol (MCP) server that provides access to ARIA Access APIs for healthcare data management, including patient demographics, appointments, billing, and radiation therapy data.

## Features

This MCP server implements comprehensive healthcare data access including:

### 🔐 Authentication
- Secure authentication with ARIA Access API
- Token management with automatic refresh
- Environment variable configuration

### 👥 Patient Management
- **Patient demographics retrieval** - Get patient information by various criteria
- **Patient creation** - Create new patients with comprehensive demographic data
- **Patient updates** - Update existing patient information
- Patient search by various criteria (ID, name, MRN, DOB)
- Comprehensive patient information display

### 👨‍⚕️ Doctor Management
- **Doctor creation** - Create new doctors with specialty and contact information
- **Doctor information retrieval** - Get doctor details by ID or department
- **Doctor assignment** - Assign doctors to patients with role specification
- **Assigned doctors lookup** - Get all doctors assigned to a specific patient
- **Machine list retrieval** - Get available treatment machines

### 🏥 Resource Management
- Available resources (machines, rooms, staff)
- Resource availability and scheduling
- Resource type filtering

### 📋 Diagnosis Management
- **Patient diagnosis retrieval** - Get patient diagnosis information
- **Diagnosis creation** - Create new patient diagnoses with staging information
- **Diagnosis updates** - Update existing patient diagnoses
- Diagnosis details including primary site, histology, stage
- Diagnosis status and notes

### 📅 Appointment Management
- **Patient appointment retrieval** - Get patient appointments within a date range
- **Machine appointment creation** - Create new machine appointments
- **Machine appointment updates** - Update existing machine appointments
- **Machine appointment retrieval** - Get machine appointments for specific time ranges
- Date range filtering
- Appointment details including type, status, provider

### 💰 Billing Data
- Patient billing information
- Insurance and procedure details
- Billing status and amounts
- **Billing information retrieval** - Get billing data for date ranges
- **Billing acknowledgment** - Acknowledge receipt of billing information

### ☢️ Radiation Therapy Data
- **Radiation therapy courses** - Complete course information including fractions, doses, target volumes
- **Treatment plans** - Detailed plan information with beam counts, approval status
- **Plan setups** - Treatment plan setup configurations
- **Treatment fields** - Individual treatment field details with angles and doses
- **Treated field information** - Historical treatment delivery records
- **Patient reference points** - Anatomical reference points for treatment planning
- **Clinical concepts** - Patient-specific clinical data and measurements

### 🏷️ RFID Vendor Connectivity
- **Patient identification** - Get patient information by various ID types
- **Resource identification** - Get resource details by RFID or other ID types
- **Appointment lookup** - Find appointments using patient ID types

### 🔧 Helper Services
- **Diagnosis lookups** - Get diagnosis method and type lists
- **General lookups** - Get various lookup lists (marital status, etc.)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd aria-mcp-server
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

## Configuration

Set the following environment variables for ARIA Access API configuration:

```bash
export ARIA_BASE_URL="https://your-aria-instance.com"
export ARIA_CLIENT_ID="your-client-id"
export ARIA_CLIENT_SECRET="your-client-secret"
export ARIA_USERNAME="your-username"
export ARIA_PASSWORD="your-password"
```

## Usage

### Running the Server

```bash
npm start
```

### Available Tools

The MCP server provides the following tools:

#### Authentication
- `authenticate` - Authenticate with ARIA Access API using credentials

#### Patient Data
- `get-patient-demographics` - Retrieve patient demographic information
- `create-patient` - Create a new patient in ARIA
- `update-patient` - Update an existing patient in ARIA
- `get-patient-diagnosis` - Get patient diagnosis information
- `create-patient-diagnosis` - Create a new patient diagnosis in ARIA
- `update-patient-diagnosis` - Update an existing patient diagnosis in ARIA

#### Doctor Management
- `create-doctor` - Create a new doctor in ARIA
- `get-doctor-info` - Get doctor information
- `assign-doctor-to-patient` - Assign a doctor to a patient
- `get-doctors-assigned-to-patient` - Get doctors assigned to a patient
- `get-machine-list` - Get list of available machines

#### Resource Management
- `get-resources` - Get available resources (machines, rooms, staff)

#### Appointments
- `get-appointments` - Retrieve patient appointments within a date range
- `create-machine-appointment` - Create a new machine appointment in ARIA
- `update-machine-appointment` - Update an existing machine appointment in ARIA
- `get-machine-appointments` - Get machine appointments for a specific time range

#### Billing
- `get-billing-data` - Get patient billing information
- `get-billing-info` - Get billing information for a date range
- `acknowledge-billing-info-received` - Acknowledge that billing information has been received

#### Radiation Therapy
- `get-radiation-courses` - Get radiation therapy courses and plan setups for a patient
- `get-treatment-plans` - Get radiation treatment plans for a patient
- `get-plan-setups` - Get radiation treatment plan setups for a patient
- `get-plan-tx-fields` - Get radiation treatment plan treatment fields
- `get-fields-treated-info` - Get information about treated fields for a patient
- `get-patient-ref-points` - Get patient reference points
- `get-clinical-concepts` - Get patient clinical concepts

#### RFID Vendor Connectivity
- `get-patient-name-for-id` - Get patient name for a specific ID type
- `get-resource-details-for-id` - Get resource details for a specific ID type
- `get-patient-appointments-for-id` - Get patient appointments for a specific ID type

#### Helper Services
- `get-diagnosis-lookup-list` - Get diagnosis lookup list
- `get-lookup-list` - Get general lookup list

## API Endpoints

The server communicates with the following ARIA Access API endpoints:

- `POST /auth/token` - Authentication
- `POST /Gateway/Service.svc/rest/Process` - Main ARIA Access API endpoint for all requests

### Patient Demographics API Requests
- `GetPatientsRequest` - Get patient demographics
- `CreatePatientRequest` - Create new patient
- `UpdatePatientRequest` - Update existing patient

### Doctor Management API Requests
- `CreateDoctorRequest` - Create new doctor
- `GetDoctorsInfoRequest` - Get doctor information
- `AssignDoctorToPatientRequest` - Assign doctor to patient
- `GetDoctorsAssignedToPatientRequest` - Get doctors assigned to patient
- `GetMachineListRequest` - Get machine list

### Diagnosis Management API Requests
- `GetPatientDiagnosesRequest` - Get patient diagnoses
- `CreatePatientDiagnosisRequest` - Create new patient diagnosis
- `UpdatePatientDiagnosisRequest` - Update existing patient diagnosis

### Appointment Management API Requests
- `CreateMachineAppointmentRequest` - Create machine appointment
- `UpdateMachineAppointmentRequest` - Update machine appointment
- `GetMachineAppointmentsRequest` - Get machine appointments

### Radiation Therapy API Requests
- `GetPatientCoursesAndPlanSetupsRequest` - Get patient courses and plan setups
- `GetPatientPlansRequest` - Get patient treatment plans
- `GetPatientPlanSetupsRequest` - Get patient plan setups
- `GetPatientPlanTxFieldsRequest` - Get treatment plan fields
- `GetPatientFieldsTreatedInfoRequest` - Get treated field information
- `GetPatientRefPointsRequest` - Get patient reference points
- `GetPatientClinicalConceptsRequest` - Get patient clinical concepts

### RFID Connectivity API Requests
- `GetPatientNameForIDRequest` - Get patient name by ID type
- `GetResourceDetailsForIDRequest` - Get resource details by ID type
- `GetPatientAppointmentsForIDRequest` - Get patient appointments by ID type

### Helper Service API Requests
- `GetDiagnosisLookUpListRequest` - Get diagnosis lookup lists
- `GetLookUpListRequest` - Get general lookup lists

### Billing Management API Requests
- `GetBillingInfoRequest` - Get billing information for date range
- `AcknowledgeBillingInfoReceivedRequest` - Acknowledge billing information received

## Data Format

All responses are formatted as structured text with clear field labels and separators for easy parsing by LLM agents.

### Example Patient Response
```
Found 1 patient(s):

Patient ID: 12345
Name: John Doe
Date of Birth: 1980-01-15
MRN: MRN123456
Gender: Male
Address: 123 Main St, Anytown, CA 90210
Phone: (555) 123-4567
Email: john.doe@email.com
Status: New Patient (NP)
---
```

### Example Doctor Response
```
Found 1 doctor(s):

Doctor ID: Oncologist1
Name: DR Joe Mathew
Display Name: Dr_646893646893
Specialty: Oncology
Institution: Oncology
Location: Life Core Hospital
Phone: 123-234-2345
Fax: 123-12345
Is Oncologist: Yes
---
```

### Example Diagnosis Response
```
Found 1 diagnosis(es):

Diagnosis ID: 2
Primary Site: 28
Histology: 0
Stage: Stage X
Date: 2016-01-08T12:31:11+05:30
Status: 6
Clinical Description: Malignant neoplasm of lower lip, vermilion border
Diagnosis Code: 140.1
Is Confirmed: No
Is Historic: No
---
```

### Example Machine Appointment Response
```
Found 1 machine appointment(s):

Appointment ID: 12345
Patient ID: PId1_14060851406085140609
Machine ID: Varian2300CD
Start Time: 2016-01-07T09:32:00+05:30
End Time: 2016-01-07T09:47:00+05:30
Activity Name: Daily Treatment
Activity Status: Open
Activity Note: Note
Department: Oncology11
---
```

### Example Radiation Course Response
```
Found 1 radiation therapy course(s):

Course ID: RT001
Course Name: Breast RT Course
Start Date: 2024-01-15
End Date: 2024-02-15
Status: Active
Total Fractions: 25
Completed Fractions: 10
Prescription Dose: 5000 cGy
Target Volume: Left Breast
Treatment Type: Linac
---
```

### Example Treatment Plan Response
```
Found 1 treatment plan(s):

Plan ID: Plan1
Plan Name: Breast IMRT Plan
Course ID: C1
Plan Type: IMRT
Status: Approved
Created Date: 2024-01-10
Approved Date: 2024-01-12
Total Dose: 5000 cGy
Fractions: 25
Beam Count: 7
Plan Setup ID: Setup1
---
```

### Example Treatment Field Response
```
Found 3 treatment field(s):

Field ID: Field1
Field Name: AP Field
Plan ID: Plan1
Course ID: C1
Field Type: IMRT
Gantry Angle: 0
Collimator Angle: 0
Couch Angle: 0
Dose: 200 cGy
MU: 180
---
```

### Example Billing Response
```
Found 1 billing record(s):

Billing ID: BILL001
Patient ID: 12345
Patient Name: John Doe
Service Date: 2024-01-15
Charge Amount: $1500.00
Procedure Code: 77427
Procedure Description: Radiation treatment delivery
Insurance Provider: Blue Cross Blue Shield
Billing Status: Pending
Department: Radiation Oncology
Provider: Dr. Smith
---
```

### Example Billing Acknowledgment Response
```
Billing information acknowledgment successful!
Export Acknowledge Date: 2024-01-15
TSA Serial Number: 7
---
```

## Security

- All API communications use HTTPS
- Authentication tokens are managed securely
- Credentials can be provided via environment variables or through the authenticate tool
- No sensitive data is logged

## Error Handling

The server includes comprehensive error handling:
- Authentication failures
- API request failures
- Data validation errors
- Network connectivity issues

All errors are returned as structured text responses for easy processing by LLM agents.

## Development

### Building
```bash
npm run build
```

### Development Mode
```bash
npm run dev
```

### TypeScript
The project is written in TypeScript with strict type checking enabled.

## Dependencies

- `@modelcontextprotocol/sdk` - MCP server framework
- `zod` - Schema validation
- `typescript` - TypeScript compiler

## License

MIT License

Copyright (c) 2025 Sandeepan Ganguly

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Support

For issues and questions, please refer to the ARIA Access API documentation or contact your system administrator. 