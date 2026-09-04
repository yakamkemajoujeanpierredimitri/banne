/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    user: import('@prisma/client').User | null;
    session: import('@prisma/client').Session | null;
    lang?: string;
  }
}
