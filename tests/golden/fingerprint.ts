/**
 * Skill-text fingerprinting — canonical implementation moved to cli/lib/fingerprint.ts.
 *
 * This module is a thin re-export kept for backward compatibility so that existing
 * importers (fingerprint.test.ts, bootstrap-fingerprints.ts, etc.) continue to work
 * unchanged.
 */

export { listSkillFiles, fingerprintSkills, type SkillFingerprint } from '../../cli/lib/fingerprint';
