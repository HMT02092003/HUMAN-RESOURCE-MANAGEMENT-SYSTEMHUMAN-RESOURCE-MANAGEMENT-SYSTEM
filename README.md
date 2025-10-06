# HRMS Microservices Architecture

Hệ thống quản lý nhân sự (HRMS) được xây dựng theo kiến trúc microservices với API Gateway.

## 🏗️ Kiến trúc hệ thống

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │  API Gateway    │    │   Microservices │
│   (Next.js)     │◄──►│   (Port 3000)   │◄──►│                 │
│   (Port 3001)   │    │                 │    │ ┌─────────────┐ │
└─────────────────┘    └─────────────────┘    │ │Auth Service │ │
                                              │ │(Port 4001)  │ │
                                              │ └─────────────┘ │
                                              │ ┌─────────────┐ │
                                              │ │Employee     │ │
                                              │ │Service      │ │
                                              │ │(Port 4002)  │ │
                                              │ └─────────────┘ │
                                              │ ┌─────────────┐ │
                                              │ │Attendance   │ │
                                              │ │Service      │ │
                                              │ │(Port 4003)  │ │
                                              │ └─────────────┘ │
                                              │ ┌─────────────┐ │
                                              │ │Payroll      │ │
                                              │ │Service      │ │
                                              │ │(Port 4004)  │ │
                                              │ └─────────────┘ │
                                              │ ┌─────────────┐ │
                                              │ │Notification │ │
                                              │ │Service      │ │
                                              │ │(Port 4005)  │ │
                                              │ └─────────────┘ │
                                              └─────────────────┘
``