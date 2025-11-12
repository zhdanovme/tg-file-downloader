/**
 * Configuration file loader with JSON Schema validation
 */

import Ajv from 'ajv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { Configuration } from '../types/index.js';
import { ConfigError } from '../utils/errors.js';
import { getDefaultConfig } from './defaults.js';
import { validateConfig } from './validator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Load JSON schema for configuration
 */
async function loadSchema(): Promise<any> {
  const schemaPath = path.join(__dirname, 'schemas', 'configuration.schema.json');
  const schemaContent = await fs.readFile(schemaPath, 'utf-8');
  return JSON.parse(schemaContent);
}

/**
 * Resolve config file path (support relative and absolute paths)
 */
export function resolveConfigPath(configPath: string): string {
  // Check if path is absolute
  if (path.isAbsolute(configPath)) {
    return configPath;
  }

  // Check environment variable
  const envPath = process.env.TG_DOWNLOADER_CONFIG;
  if (envPath) {
    return path.resolve(envPath);
  }

  // Resolve relative to current working directory
  return path.resolve(process.cwd(), configPath);
}

/**
 * Load and validate configuration from file
 */
export async function loadConfig(configPath: string): Promise<Configuration> {
  const resolvedPath = resolveConfigPath(configPath);

  try {
    // Read config file
    const configContent = await fs.readFile(resolvedPath, 'utf-8');
    const parsedConfig = JSON.parse(configContent);

    // Load and compile schema
    const schema = await loadSchema();
    const ajv = new Ajv();
    const validate = ajv.compile(schema);

    // Validate against schema
    const valid = validate(parsedConfig);
    if (!valid) {
      const errors = validate.errors
        ?.map((err) => `${err.instancePath} ${err.message}`)
        .join(', ');
      throw new ConfigError(
        `Configuration validation failed: ${errors}`,
        'VALIDATION_ERROR'
      );
    }

    // Type assertion after validation
    const config = parsedConfig as Configuration;

    // Additional validation
    const warnings = validateConfig(config);
    if (warnings.length > 0) {
      console.warn('Configuration warnings:');
      warnings.forEach((warning) => console.warn(`  - ${warning}`));
    }

    // Merge with defaults
    const defaultConfig = getDefaultConfig();
    return {
      groups: { ...defaultConfig.groups, ...config.groups },
      files: { ...defaultConfig.files, ...config.files },
      download: { ...defaultConfig.download, ...config.download },
      session: { ...defaultConfig.session, ...config.session },
    };
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      throw new ConfigError(
        `Configuration file not found: ${resolvedPath}`,
        'FILE_NOT_FOUND'
      );
    }

    if (error instanceof SyntaxError) {
      throw new ConfigError(
        `Invalid JSON in configuration file: ${error.message}`,
        'INVALID_JSON'
      );
    }

    throw error;
  }
}

/**
 * Load configuration or return default if file doesn't exist
 */
export async function loadConfigOrDefault(
  configPath: string
): Promise<Configuration> {
  try {
    return await loadConfig(configPath);
  } catch (error: any) {
    if (error.code === 'FILE_NOT_FOUND') {
      return getDefaultConfig();
    }
    throw error;
  }
}
