---
description: Run all .NET test suites
agent: dotnet-builder
---

Use the dotnet-builder sub-agent to run all test suites and report any errors.

Run these test commands:
1. dotnet test Patient.slnx
2. dotnet test Logistics.slnx

Note: These test suites may take up to 5 minutes to run in total.

Note: Logistics.ScenarioTests have 2 flaky tests, related to grouping that sometimes fail. There test failures should be reported as flaky, so the caller does not need to worry and attempt to fix them.
