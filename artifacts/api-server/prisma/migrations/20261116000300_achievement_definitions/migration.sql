INSERT INTO "Achievement" ("code", "ruleVersion", "eligibilityRule")
VALUES
  ('seven-day-warrior', 1, '{"minimumActiveStreak": 7}'::jsonb),
  ('iron-will', 1, '{"requiresRecoveryActivation": true}'::jsonb),
  ('hundred-gates', 1, '{"minimumLifetimeCompletions": 100}'::jsonb);
