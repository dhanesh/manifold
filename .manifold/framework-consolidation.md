# framework-consolidation

## Outcome

Single consistent naming, schema, and documentation for Manifold framework

---

## Constraints

### Business

#### B1: Existing install script must continue to work

Existing install script must continue to work

> **Rationale:** Users may have already installed via curl | bash

#### B2: No breaking changes to /m* command syntax

No breaking changes to /m* command syntax

> **Rationale:** /m commands are the installed canonical version

#### B3: Single naming scheme across all documentation

Single naming scheme across all documentation

> **Rationale:** Reduces confusion and cognitive load

### Technical

#### T1: All YAML files must use consistent schema

All YAML files must use consistent schema

> **Rationale:** Hook and tooling depend on predictable structure

#### T2: Directory path must be 

Directory path must be .manifold/ everywhere

> **Rationale:** Install script creates .manifold/, not .temporal/

#### T3: Schema must use snake_case for all keys

Schema must use snake_case for all keys

> **Rationale:** YAML convention and existing example uses snake_case

#### T4: Hook must handle both old and new schema gracefully

Hook must handle both old and new schema gracefully

> **Rationale:** Backward compatibility during transition

### User Experience

#### U1: Single README with complete quick start

Single README with complete quick start

> **Rationale:** New users need one place to learn

#### U2: Command reference must be comprehensive in SKILL

Command reference must be comprehensive in SKILL.md

> **Rationale:** AI agents read SKILL.md for command understanding

#### U3: Example file must match actual generated schema

Example file must match actual generated schema

> **Rationale:** Examples should be copy-paste ready

### Security

#### S1: No credentials or secrets in any file

No credentials or secrets in any file

> **Rationale:** Public repository

### Operational

#### O1: Archive deprecated files, don't delete

Archive deprecated files, don't delete

> **Rationale:** Preserve history and allow recovery

#### O2: All changes must be in single atomic commit

All changes must be in single atomic commit

> **Rationale:** Easy to revert if issues found

---

## Tensions

### TN1: Consistent schema vs backward compatibility

Consistent schema vs backward compatibility

> **Resolution:** Hook handles both 'ux' and 'user_experience' keys, logs deprecation warning

### TN2: Single naming scheme vs preserving old files

Single naming scheme vs preserving old files

> **Resolution:** Move deprecated files to _archive/ directory with README explaining status

### TN3: Example must match schema, schema uses snake_case

Example must match schema, schema uses snake_case

> **Resolution:** Update example to use snake_case 'user_experience' instead of 'ux'
