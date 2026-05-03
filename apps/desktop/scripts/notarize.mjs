import { notarize } from "@electron/notarize";

function hasApiKeyCredentials() {
  return Boolean(
    process.env.APPLE_API_KEY && process.env.APPLE_API_KEY_ID && process.env.APPLE_API_ISSUER,
  );
}

function hasAppleIdCredentials() {
  return Boolean(
    process.env.APPLE_ID && process.env.APPLE_APP_SPECIFIC_PASSWORD && process.env.APPLE_TEAM_ID,
  );
}

export default async function notarizeApp(context) {
  if (context.electronPlatformName !== "darwin") {
    return;
  }

  if (!hasApiKeyCredentials() && !hasAppleIdCredentials()) {
    console.log("[notarize] Skipping notarization because Apple credentials are not configured.");
    return;
  }

  const appPath = `${context.appOutDir}/${context.packager.appInfo.productFilename}.app`;

  if (hasApiKeyCredentials()) {
    await notarize({
      appPath,
      appleApiKey: process.env.APPLE_API_KEY,
      appleApiKeyId: process.env.APPLE_API_KEY_ID,
      appleApiIssuer: process.env.APPLE_API_ISSUER,
      teamId: process.env.APPLE_TEAM_ID,
    });
    return;
  }

  await notarize({
    appPath,
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
    teamId: process.env.APPLE_TEAM_ID,
  });
}
