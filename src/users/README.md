# Users Module

The Users module manages user accounts, profiles, addresses, and settings within the e-commerce platform. It provides functionality for user registration, authentication, profile management, and administrative user management.

## Table of Contents

- [Overview](#overview)
- [Endpoints](#endpoints)
  - [User Management (Admin)](#user-management-admin)
  - [Profile Management](#profile-management)
  - [Address Management](#address-management)
  - [Settings Management](#settings-management)
- [Data Models](#data-models)
  - [User](#user)
  - [Profile](#profile)
  - [Address](#address)
  - [Settings](#settings)
- [Authentication & Authorization](#authentication--authorization)
- [Error Handling](#error-handling)

## Overview

The Users module provides a comprehensive set of APIs for managing user data including personal information, addresses, preferences, and administrative functions. It integrates with the authentication system to ensure secure access to user-specific data.

## Endpoints

All endpoints require appropriate authentication and authorization as specified.

### User Management (Admin)

#### Get All Users
- **Endpoint**: `GET /users`
- **Permissions**: Admin only
- **Description**: Retrieve a paginated list of all users in the system
- **Query Parameters**:
  - `page` (optional): Page number for pagination (default: 1)
  - `limit` (optional): Number of items per page (default: 10)
  - `search` (optional): Search term to filter users
  - `role` (optional): Filter users by role

#### Get User by ID
- **Endpoint**: `GET /users/:id`
- **Permissions**: Admin only
- **Description**: Retrieve detailed information about a specific user

#### Update User
- **Endpoint**: `PATCH /users/:id`
- **Permissions**: Admin only
- **Description**: Update information for a specific user

### Profile Management

#### Update Profile
- **Endpoint**: `PATCH /users/profile`
- **Permissions**: Authenticated users
- **Description**: Update the profile information of the current user

### Address Management

#### Get Addresses
- **Endpoint**: `GET /users/addresses`
- **Permissions**: Authenticated users
- **Description**: Retrieve all addresses associated with the current user

#### Create Address
- **Endpoint**: `POST /users/addresses`
- **Permissions**: Authenticated users
- **Description**: Add a new address to the current user's address book

#### Update Address
- **Endpoint**: `PATCH /users/addresses/:id`
- **Permissions**: Authenticated users (owner of the address)
- **Description**: Update an existing address

#### Delete Address
- **Endpoint**: `DELETE /users/addresses/:id`
- **Permissions**: Authenticated users (owner of the address)
- **Description**: Remove an address from the address book

### Settings Management

#### Update Settings
- **Endpoint**: `PATCH /users/settings`
- **Permissions**: Authenticated users
- **Description**: Update user preferences and settings

## Data Models

### User

Represents a user account in the system.

| Field | Type | Description |
|-------|------|-------------|
| id | string (UUID) | Unique identifier |
| email | string | Email address (unique) |
| password | string | Hashed password |
| firstName | string | First name |
| lastName | string | Last name |
| phone | string (optional) | Phone number |
| avatar | string (optional) | Avatar image URL |
| role | enum | User role (ADMIN, SUB_ADMIN, VENDOR, BUYER, RIDER) |
| isActive | boolean | Account status |
| emailVerified | boolean | Email verification status |
| createdAt | datetime | Creation timestamp |
| updatedAt | datetime | Last update timestamp |

### Profile

Extended profile information for users.

| Field | Type | Description |
|-------|------|-------------|
| id | string (UUID) | Unique identifier |
| bio | string (optional) | User biography |
| gender | enum (optional) | Gender identity |
| dateOfBirth | datetime (optional) | Birth date |
| userId | string (UUID) | Reference to User |
| createdAt | datetime | Creation timestamp |
| updatedAt | datetime | Last update timestamp |

### Address

User address information.

| Field | Type | Description |
|-------|------|-------------|
| id | string (UUID) | Unique identifier |
| street | string | Street address |
| city | string | City |
| state | string | State or province |
| postalCode | string | Postal/ZIP code |
| country | string | Country |
| isDefault | boolean | Default address flag |
| userId | string (UUID) | Reference to User |
| createdAt | datetime | Creation timestamp |
| updatedAt | datetime | Last update timestamp |

### Settings

User preferences and settings.

| Field | Type | Description |
|-------|------|-------------|
| id | string (UUID) | Unique identifier |
| userId | string (UUID) | Reference to User |
| language | string | Preferred language (default: "en") |
| currency | string | Preferred currency (default: "USD") |
| darkMode | boolean | Dark mode preference |
| emailNotifications | boolean | Email notifications enabled |
| pushNotifications | boolean | Push notifications enabled |
| smsNotifications | boolean | SMS notifications enabled |
| createdAt | datetime | Creation timestamp |
| updatedAt | datetime | Last update timestamp |

## Authentication & Authorization

All endpoints in the Users module require authentication via JWT tokens. Some endpoints have additional role-based access controls:

- **Admin endpoints**: Require `ADMIN` role
- **User endpoints**: Require authentication
- **Owner endpoints**: Require authentication and ownership of the resource

### Headers

All authenticated requests must include the Authorization header:

```
Authorization: Bearer <JWT_TOKEN>
```

## Error Handling

The API uses standard HTTP status codes to indicate the success or failure of requests:

| Status Code | Description |
|-------------|-------------|
| 200 | Successful GET, PATCH requests |
| 201 | Successful POST requests |
| 400 | Bad request - Invalid input data |
| 401 | Unauthorized - Missing or invalid authentication |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not found - Resource does not exist |
| 500 | Internal server error |

Error responses follow this format:
```json
{
  "statusCode": 400,
  "message": "Error message",
  "error": "Bad Request"
}
```