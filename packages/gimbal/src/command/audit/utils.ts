import { addSpinner } from '@modus/gimbal-core/lib/logger';
import { exists, resolvePath } from '@modus/gimbal-core/lib/utils/fs';
import { URL } from 'url';

import { Report } from '@/typings/command';
import { AuditObject, Capabilities, ConfigValue } from '@/typings/command/audit';
import { Context } from '@/typings/context';

const buildDirs = ['build', 'dist'];

const defaultAudits = {
  'heap-snapshot': true,
  lighthouse: true,
  size: true,
  'unused-source': true,
};

export const addSpinners = (audits: AuditObject, route?: string): void =>
  Object.keys(audits).forEach((name: string) => {
    if (route) {
      addSpinner(name, { status: 'stopped', text: `[ ${name} ] - ${route}` });
    } else {
      addSpinner(name, `[ ${name} ]`);
    }
  });

export const didAuditPass = (report?: Report): boolean => !report || report.success;

export const findBuildDir = async (context: Context, dirArr = buildDirs): Promise<string | void> => {
  const arr = dirArr.slice();

  if (arr.length !== 0) {
    const dir = arr.shift();
    const cwd = context.config.get('configs.cwd');
    const fullPath = resolvePath(cwd, dir as string);

    if (await exists(fullPath)) {
      return fullPath;
    }
  }

  return findBuildDir(context, arr);
};

export const getModulesToRun = (audits: AuditObject, index: number, context: Context): AuditObject => {
  const toRun: AuditObject = {};

  Object.keys(audits).forEach((name: string): void => {
    const obj = audits[name];

    if (!obj.disabled) {
      const meta = context.module.getMeta(name);

      if (!meta || !meta.maxNumRoutes || index <= meta.maxNumRoutes) {
        toRun[name] = {
          ...obj,
        };
      }
    }
  });

  return toRun;
};

export const isModuleBrowserable = (context: Context): boolean => {
  const audits: AuditObject = context.config.get('audits');

  return Object.keys(audits).some((audit: string): boolean => {
    const meta = context.module.getMeta(audit);

    return meta != null && meta.capabilities.browser === true;
  });
};

// TODO bet we need a better way to know if a route is local
// if it throws an error, likely an invalid url and therefore
// just a route, not a URI
export const isRouteLocal = (route: string): boolean => {
  try {
    /* eslint-disable-next-line no-new */
    new URL(route);

    return false;
  } catch (error) {
    return true;
  }
};

export const isRoutesLocal = (context: Context): boolean => {
  const routes: string[] = context.config.get('configs.route');

  return routes.some(isRouteLocal);
};

export const normalizeAudits = (audits: ConfigValue = defaultAudits): AuditObject => {
  if (Array.isArray(audits)) {
    const obj: AuditObject = {};

    audits.forEach((name: string): void => {
      obj[name] = {
        name,
      };
    });

    return obj;
  }

  const obj: AuditObject = {};

  Object.keys(audits).forEach((name: string): void => {
    const value = audits[name];

    if (value === true) {
      obj[name] = {
        disabled: false,
        name,
      };
    } else if (value === false) {
      obj[name] = {
        disabled: true,
        name,
      };
    } else {
      obj[name] = {
        disabled: false,
        ...value,
        name,
      };
    }
  });

  return obj;
};

export const setCapabilities = (audits: AuditObject, capabilities: Capabilities, context: Context): AuditObject => {
  Object.keys(audits).forEach((name: string): void => {
    const obj = audits[name];
    const meta = context.module.getMeta(name);

    if (meta) {
      // check if there are only remote routes, disable
      // those modules that are local only
      obj.disabled = !capabilities.hasLocalRoute && !meta.capabilities.remote;
    } else {
      obj.disabled = true;
    }
  });

  return audits;
};
