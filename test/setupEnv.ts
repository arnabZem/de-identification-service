// Tests must not depend on the shell or a .env: quiet logs, built-in rules only (custom-rule tests set their own file).
process.env.LOG_LEVEL = 'error';
delete process.env.CUSTOM_RULES_FILE;
