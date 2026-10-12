---
name: "🧪 Feature Validation & Feedback"
about: Validate a completed feature, identify defects, and recommend follow-on enhancements.
title: "[VALIDATION] - "
labels: "UX - Input Needed, documentation"
assignees: ""
---

## 🎯 Validation Objective

Describe the feature, workflow, or capability being tested.  

### Previous Work
-[Link to all previous GitHub issues and bugs.]

---

## 📋 Testing Scope

### Included

- [ ] Core workflow
- [ ] Permissions
- [ ] Usability

### Excluded

- [ ] Out-of-scope functionality

---

## 🧪 Validation Activities

Execute all relevant testing scenarios and evaluate both expected and unexpected behavior.

--Delete Me Examples: --
- Submit a report
- Resolve a moderation case
- Verify audit history

---

## 📝 Tester Instructions

Do not modify this issue description.

### Phase 1 - Initial Feedback

After your first testing pass, add one or more comments containing:

- Initial observations
- Areas of concern
- Potential usability issues
- Questions or recommendations
- Anything that feels incomplete or confusing

The goal is to quickly identify themes before creating implementation work.

### Phase 2 - Create Follow-on Issues

After additional validation:

#### Create a Bug Issue when:

- Behavior is incorrect.
- Functionality is broken.
- Requirements are not met.
- A fix is clearly understood and reasonably scoped.

Recommended labels:

- `bug`
- `ui`
- `api`

Tester may assign an appropriate priority.

#### Create a Feature Issue when:

- The change requires additional design.
- The solution is not yet defined.
- The scope is moderate or large.
- New functionality is being requested.
- Architectural changes may be required.

Recommended labels:

- `enhancement`
- `ui`
- `api`

Tester may assign an appropriate priority and provide a rough size estimate.

---

## 🔗 Follow-on Work Tracking

All implementation work should be captured in separate GitHub Issues.

### Linked Bug Issues

- [ ] #____
- [ ] #____
- [ ] #____

### Linked Feature Issues

- [ ] #____
- [ ] #____
- [ ] #____

---

## 📊 Validation Summary

### Testing Status

- [ ] Complete
- [ ] Partial
- [ ] Blocked

### Production Readiness

- [ ] Not Ready
- [ ] Needs Significant Changes
- [ ] Needs Minor Changes
- [ ] Ready for Release

### Final Summary

Provide a final comment summarizing:

- Major findings
- Bugs submitted
- Features submitted
- Overall readiness assessment

---

## ✅ Completion Criteria

This validation issue may be closed once:

- [ ] Initial feedback and concerns have been documented through comments.
- [ ] Testing activities have been completed.
- [ ] All discovered bugs have been created as separate GitHub issues.
- [ ] All discovered feature requests have been created as separate GitHub issues.
- [ ] Priority has been assigned to created issues where appropriate.
- [ ] Size estimates have been provided for feature requests where appropriate.
- [ ] All created issues have been linked from this validation issue.
- [ ] A final validation summary comment has been provided with a link to each issue, noting relationships between issues.

### Parent / Child Relationship

This validation issue acts as the parent tracking issue.

Any bug or feature request discovered during validation should be created as a child issue and linked here.

Implementation work should occur in the child issues. This validation record should remain focused on testing outcomes, findings, and recommendations.