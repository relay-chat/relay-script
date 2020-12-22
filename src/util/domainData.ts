const API_DOMAIN = "https://api-www.relaychat.app";

export const getButtonColor = async () => {
  const domain = window?.location?.hostname;

  if (!domain) {
    return null;
  }

  try {
    const resp = await (
      await fetch(`${API_DOMAIN}/api/v1/domains/domain?domain=${domain}`)
    ).json();
    if (resp?.ok && resp?.domain?.button_color) {
      return resp.domain.button_color;
    }
    return null;
  } catch (e) {
    console.error(e);
  }
};
