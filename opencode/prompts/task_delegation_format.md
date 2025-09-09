title: <one-line imperative>

task_id: <unique_task_name_in_snake_case>
session_id: <string>

task:
  goal: <1–2 sentences>

context:
  repo_paths:
    - <src/.../File1.fs>
    - <tests/.../File2.fs>
  background: <short rationale>

interfaces:
  - <endpoint or function signature to respect>

expected_outcome:
  behavior: <observable behavior or API contract>
  artifacts:
    - <files created or updated>

definition_of_done:
  # examples, there can be multiple projects to build and test
  # these need to be executable comands with expected exit code 0 outcomes.
  build: "dotnet build <path-to-project>"
  tests: "dotnet test <path-to-project> --nologo"

timebox: <"5m" for fast-coder | "10m" for expert-coder>

rules_and_output:
  - Keep changes minimal and within repo_paths.
  - Run DoD commands and include results (stdout/stderr + exit codes).
  - Stop if timebox is reached; return partial work + next steps.
  - Output sections (in order):
    - Summary
    - Design Decisions
    - Files
    - Diffs/Files
    - Command Runs (with results)
    - Acceptance Results
    - Follow-ups/Risks
