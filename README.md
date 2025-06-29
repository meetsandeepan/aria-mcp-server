# ARIA Access MCP Server

A Model Context Protocol (MCP) server that provides access to ARIA Access APIs for healthcare data management, including patient demographics, appointments, billing, and radiation therapy data.

## Features

This MCP server implements comprehensive healthcare data access including:

### 🔐 Authentication
- Secure authentication with ARIA Access API
- Token management with automatic refresh
- Environment variable configuration

### 👥 Patient Management
- Patient demographics retrieval
- Patient search by various criteria (ID, name, MRN, DOB)
- Comprehensive patient information display

### 🏥 Resource Management
- Available resources (machines, rooms, staff)
- Resource availability and scheduling
- Resource type filtering

### 📋 Diagnosis Management
- Patient diagnosis information
- Diagnosis details including primary site, histology, stage
- Diagnosis status and notes

### 📅 Appointment Management
- Patient appointment retrieval
- Date range filtering
- Appointment details including type, status, provider

### 💰 Billing Data
- Patient billing information
- Insurance and procedure details
- Billing status and amounts

### ☢️ Radiation Therapy Data
- **Radiation therapy courses** - Complete course information including fractions, doses, target volumes
- **Treatment plans** - Detailed plan information with beam counts, approval status
- **Treatment sessions** - Individual treatment delivery records with machine and technologist details

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
- `get-patient-diagnosis` - Get patient diagnosis information

#### Resource Management
- `get-resources` - Get available resources (machines, rooms, staff)

#### Appointments
- `get-appointments` - Retrieve patient appointments within a date range

#### Billing
- `get-billing-data` - Get patient billing information

#### Radiation Therapy
- `get-radiation-courses` - Get radiation therapy courses for a patient
- `get-treatment-plans` - Get radiation treatment plans
- `get-treatments` - Get radiation treatment sessions

## API Endpoints

The server communicates with the following ARIA Access API endpoints:

- `POST /auth/token` - Authentication
- `GET /patients` - Patient demographics
- `GET /resources` - Resource information
- `GET /diagnoses` - Patient diagnoses
- `GET /appointments` - Patient appointments
- `GET /billing` - Billing data
- `GET /radiation/courses` - Radiation therapy courses
- `GET /radiation/plans` - Treatment plans
- `GET /radiation/treatments` - Treatment sessions

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

[Add your license information here]

## Support

For issues and questions, please refer to the ARIA Access API documentation or contact your system administrator. 