const API_DOMAIN = "https://api-www.relaychat.app";

export interface Domain {
  domain: string;
  button_color?: string;
  path_whitelist?: string[];
}

export const getDomain = async (): Promise<null | Domain> => {
  const domain = window?.location?.hostname;
  if (!domain) {
    return null;
  }

  try {
    const resp = await (
      await fetch(`${API_DOMAIN}/api/v1/domains/domain?domain=${domain}`)
    ).json();

    if (resp?.ok && resp?.domain) {
      return resp.domain as Domain;
    }
  } catch (e) {
    console.error(e);
  }

  return null;
};
