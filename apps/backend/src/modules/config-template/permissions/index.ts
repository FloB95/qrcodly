// will be used later for organization management

export const CONFIG_TEMPLATE_PERMISSIONS = [
	'configTemplate:list',
	'configTemplate:read',
	'configTemplate:write',
	'configTemplate:update',
	'configTemplate:delete',
] as const;

export type ConfigTemplatePermissions = (typeof CONFIG_TEMPLATE_PERMISSIONS)[number];
