import fs from "fs";
import path from "path";
import crypto from "crypto";

const DATA_DIR = path.join(process.cwd(), "data");

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getFilePath(entity: string): string {
  ensureDir();
  return path.join(DATA_DIR, `${entity}.json`);
}

export function readStore<T>(entity: string, defaultData: T[] = []): T[] {
  try {
    const file = getFilePath(entity);
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, JSON.stringify(defaultData, null, 2), "utf-8");
      return defaultData;
    }
    const content = fs.readFileSync(file, "utf-8");
    return JSON.parse(content) as T[];
  } catch (err) {
    console.warn(`Could not read local store for ${entity}:`, err);
    return defaultData;
  }
}

export function writeStore<T>(entity: string, data: T[]): void {
  try {
    const file = getFilePath(entity);
    fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.warn(`Could not write local store for ${entity}:`, err);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function addItemToStore<T extends Record<string, any>>(entity: string, item: T): T {
  const items = readStore<T>(entity);
  const newItem = {
    ...item,
    id: item.id || `loc_${crypto.randomUUID()}`,
    createdAt: (item as unknown as { createdAt?: Date }).createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  items.unshift(newItem);
  writeStore(entity, items);
  return newItem;
}
