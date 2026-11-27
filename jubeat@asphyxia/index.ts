import { registerVersions } from "./versions";

export async function register() {
  if (CORE_VERSION_MAJOR <= 1 && CORE_VERSION_MINOR < 31) {
    console.error("The current version of Asphyxia Core is not supported. Requires version '1.31' or later.");
    return;
  }
  R.GameCode("L44");
  R.Contributor("yuanqiuye", "https://github.com/yuanqiuye");

  registerVersions();
  R.Unhandled();
}
