# Sapthala Boutique — Architecture

## Overview
- Flutter frontend (mobile + web) communicates with Spring Boot backend and reads/writes order events to Firestore for real-time updates.
- Spring Boot handles business rules (payments, PDF generation, tasks), interacts with Firebase Admin SDK for custom claims & FCM.

## High-level components
- Flutter app (Riverpod)
- Spring Boot service (REST + JWT)
- Firebase (Auth, Firestore, Storage, FCM)
- PayU (payment gateway)
- AWS (ECS/EKS, Secrets Manager, CloudWatch)

## Data & flow highlights
- Use Firestore for real-time order documents and streams; backend ensures transactional integrity using batched writes.
- Use Cloud Functions (or backend) to trigger notifications on order state changes.

## Deployment
- Backend Docker image, CI/CD with GitHub Actions to ECR → ECS/EKS.
