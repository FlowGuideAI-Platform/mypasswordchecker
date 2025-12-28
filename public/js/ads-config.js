// Centralized ad and affiliate link configuration
// Update links here and they'll update across all pages

const AdsConfig = {
  // Affiliate links for security tools (with tracking)
  affiliateLinks: [
    {
      name: '1Password',
      url: 'https://1password.com/?utm_source=mypasswordchecker&utm_medium=referral&utm_campaign=security_tools',
      description: 'Best for families and teams'
    },
    {
      name: 'Keeper Security',
      url: 'https://www.keepersecurity.com/?utm_source=mypasswordchecker&utm_medium=referral&utm_campaign=security_tools',
      description: 'Zero-knowledge security'
    },
    {
      name: 'NordVPN',
      url: 'https://refer-nordvpn.com/IJNclnIXLoD',
      description: 'VPN and online privacy'
    },
    {
      name: 'Malwarebytes 25% off',
      url: 'https://www.kqzyfj.com/click-101572704-12217359',
      description: 'Anti-malware protection'
    },
    {
      name: 'PCmatic VPN',
      url: 'https://www.anrdoezrs.net/click-101572704-15845334',
      description: 'Most affordable & reliable high-speed VPN'
    },
    {
      name: 'LifeLock',
      url: 'https://lifelock.norton.com/?utm_source=mypasswordchecker&utm_medium=referral&utm_campaign=security_tools',
      description: 'Identity theft protection'
    }
  ],

  // Ad slots configuration
  adSlots: {
    // Google AdSense
    adsense: {
      enabled: false, // Set to true when you have AdSense account
      client: 'ca-pub-XXXXXXXXXXXXXX', // Your AdSense publisher ID
      slots: {
        banner: 'XXXXXXXXXX', // 728x90 banner slot ID
        rectangle: 'XXXXXXXXXX' // 300x250 rectangle slot ID
      }
    },

    // Carbon Ads (popular for developer-focused sites)
    carbon: {
      enabled: false,
      serve: 'XXXXXX', // Your Carbon Ads serve code
      placement: 'mypasswordcheckercom' // Your Carbon Ads placement
    },

    // BuySellAds
    buysellads: {
      enabled: false,
      zoneId: 'XXXXXX' // Your BuySellAds zone ID
    },

    // Direct ad sales (custom HTML)
    direct: {
      enabled: true,
      ads: [
        {
          size: '728x90',
          html: `<style>
            @keyframes sparkle-728 { 0%, 100% { opacity: 0; transform: scale(0); } 50% { opacity: 1; transform: scale(1.5); } }
            .sparkle-728 { position: absolute; width: 4px; height: 4px; background: white; border-radius: 50%; opacity: 0; animation: sparkle-728 3s infinite; }
          </style>
          <a href="https://www.flowguideai.com" target="_blank" rel="noopener" style="display: block; text-decoration: none;">
            <div style="width: 728px; height: 90px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; overflow: hidden; position: relative; box-shadow: 0 10px 30px rgba(0,0,0,0.2); cursor: pointer; transition: transform 0.3s;" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
              <div class="sparkle-728" style="top: 20%; left: 10%; animation-delay: 0s;"></div>
              <div class="sparkle-728" style="top: 60%; left: 30%; animation-delay: 1s;"></div>
              <div class="sparkle-728" style="top: 40%; left: 70%; animation-delay: 2s;"></div>
              <div class="sparkle-728" style="top: 75%; left: 50%; animation-delay: 1.5s;"></div>
              <div style="display: flex; align-items: center; height: 100%; padding: 0 20px; position: relative; z-index: 2;">
                <div style="width: 50px; height: 50px; background: white; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px; margin-right: 15px; flex-shrink: 0; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">📋</div>
                <div style="flex: 1; color: white;">
                  <div style="font-size: 18px; font-weight: 700; margin-bottom: 3px; line-height: 1.2;">FlowGuideAI - Document Workflows in Seconds</div>
                  <div style="font-size: 12px; opacity: 0.95; line-height: 1.3;">AI-powered workflow documentation platform trusted by enterprises</div>
                </div>
                <div style="display: flex; gap: 20px; margin-left: 20px; padding-left: 20px; border-left: 2px solid rgba(255,255,255,0.3);">
                  <div style="display: flex; align-items: center; gap: 5px; font-size: 11px; color: white; opacity: 0.95;"><span style="font-size: 14px;">🤖</span> AI Generator</div>
                  <div style="display: flex; align-items: center; gap: 5px; font-size: 11px; color: white; opacity: 0.95;"><span style="font-size: 14px;">📊</span> 36+ Templates</div>
                </div>
                <div style="background: white; color: #667eea; padding: 12px 24px; border-radius: 6px; font-weight: 700; font-size: 13px; white-space: nowrap; box-shadow: 0 4px 12px rgba(0,0,0,0.15); transition: all 0.3s;">Start Free →</div>
              </div>
            </div>
          </a>`
        },
        {
          size: '300x250',
          html: `<style>
            @keyframes sparkle-300 { 0%, 100% { opacity: 0; transform: scale(0); } 50% { opacity: 1; transform: scale(1.5); } }
            .sparkle-300 { position: absolute; width: 6px; height: 6px; background: white; border-radius: 50%; opacity: 0; animation: sparkle-300 3s infinite; }
          </style>
          <a href="https://www.flowguideai.com" target="_blank" rel="noopener" style="display: block; text-decoration: none;">
            <div style="width: 300px; height: 250px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; overflow: hidden; position: relative; box-shadow: 0 10px 30px rgba(0,0,0,0.2); cursor: pointer; transition: transform 0.3s;" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
              <div class="sparkle-300" style="top: 15%; left: 15%; animation-delay: 0s;"></div>
              <div class="sparkle-300" style="top: 30%; right: 20%; animation-delay: 1s;"></div>
              <div class="sparkle-300" style="bottom: 35%; left: 25%; animation-delay: 2s;"></div>
              <div class="sparkle-300" style="top: 60%; right: 15%; animation-delay: 1.5s;"></div>
              <div style="position: absolute; top: 12px; right: 12px; background: rgba(255,255,255,0.25); backdrop-filter: blur(10px); color: white; padding: 4px 10px; border-radius: 20px; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; z-index: 3;">AI-Powered</div>
              <div style="display: flex; flex-direction: column; height: 100%; padding: 24px; position: relative; z-index: 2; color: white;">
                <div style="display: flex; align-items: center; margin-bottom: 16px;">
                  <div style="width: 48px; height: 48px; background: white; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px; margin-right: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">📋</div>
                  <div style="font-size: 20px; font-weight: 700; line-height: 1.2;">FlowGuideAI</div>
                </div>
                <div style="font-size: 24px; font-weight: 700; margin-bottom: 12px; line-height: 1.2;">Document Workflows in Seconds</div>
                <div style="font-size: 14px; opacity: 0.95; margin-bottom: 16px; line-height: 1.4;">AI-powered platform trusted by enterprise teams</div>
                <div style="flex: 1; display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px;">
                  <div style="display: flex; align-items: center; gap: 8px; font-size: 13px;"><div style="width: 24px; height: 24px; background: rgba(255,255,255,0.2); border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 14px;">🤖</div> AI Workflow Generator</div>
                  <div style="display: flex; align-items: center; gap: 8px; font-size: 13px;"><div style="width: 24px; height: 24px; background: rgba(255,255,255,0.2); border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 14px;">📊</div> 36+ Ready Templates</div>
                  <div style="display: flex; align-items: center; gap: 8px; font-size: 13px;"><div style="width: 24px; height: 24px; background: rgba(255,255,255,0.2); border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 14px;">📝</div> Export to Multiple Formats</div>
                </div>
                <div style="background: white; color: #667eea; padding: 14px 24px; border-radius: 8px; font-weight: 700; font-size: 15px; text-align: center; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">Start Free Trial →</div>
              </div>
            </div>
          </a>`
        },
        {
          size: '970x250',
          html: `<style>
            @keyframes sparkle-970 { 0%, 100% { opacity: 0; transform: scale(0); } 50% { opacity: 1; transform: scale(1.5); } }
            .sparkle-970 { position: absolute; width: 4px; height: 4px; background: white; border-radius: 50%; opacity: 0; animation: sparkle-970 3s infinite; }
          </style>
          <a href="https://www.flowguideai.com" target="_blank" rel="noopener" style="display: block; text-decoration: none;">
            <div style="width: 100%; height: 250px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; overflow: hidden; position: relative; box-shadow: 0 10px 30px rgba(0,0,0,0.2); cursor: pointer; transition: transform 0.3s;" onmouseover="this.style.transform='scale(1.01)'" onmouseout="this.style.transform='scale(1)'">
              <div class="sparkle-970" style="top: 20%; left: 10%; animation-delay: 0s;"></div>
              <div class="sparkle-970" style="top: 60%; left: 25%; animation-delay: 1s;"></div>
              <div class="sparkle-970" style="top: 40%; left: 50%; animation-delay: 2s;"></div>
              <div class="sparkle-970" style="top: 75%; left: 70%; animation-delay: 1.5s;"></div>
              <div class="sparkle-970" style="top: 30%; right: 15%; animation-delay: 0.8s;"></div>
              <div style="position: absolute; top: 16px; right: 16px; background: rgba(255,255,255,0.25); backdrop-filter: blur(10px); color: white; padding: 6px 14px; border-radius: 24px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; z-index: 3;">AI-Powered</div>
              <div style="display: flex; align-items: center; height: 100%; padding: 0 40px; position: relative; z-index: 2;">
                <div style="width: 80px; height: 80px; background: white; border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 40px; margin-right: 30px; flex-shrink: 0; box-shadow: 0 6px 20px rgba(0,0,0,0.2);">📋</div>
                <div style="flex: 1; color: white; min-width: 0;">
                  <div style="font-size: 32px; font-weight: 700; margin-bottom: 8px; line-height: 1.1;">FlowGuideAI - Document Workflows in Seconds</div>
                  <div style="font-size: 16px; opacity: 0.95; line-height: 1.4;">AI-powered workflow documentation platform trusted by enterprise teams</div>
                </div>
                <div style="display: flex; gap: 24px; margin: 0 32px; padding: 0 32px; border-left: 2px solid rgba(255,255,255,0.3); border-right: 2px solid rgba(255,255,255,0.3); flex-shrink: 0;">
                  <div style="display: flex; flex-direction: column; align-items: center; gap: 6px;">
                    <div style="width: 48px; height: 48px; background: rgba(255,255,255,0.2); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px;">🤖</div>
                    <div style="font-size: 11px; color: white; opacity: 0.95; text-align: center; line-height: 1.3;">AI Workflow<br>Generator</div>
                  </div>
                  <div style="display: flex; flex-direction: column; align-items: center; gap: 6px;">
                    <div style="width: 48px; height: 48px; background: rgba(255,255,255,0.2); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px;">📊</div>
                    <div style="font-size: 11px; color: white; opacity: 0.95; text-align: center; line-height: 1.3;">36+ Ready<br>Templates</div>
                  </div>
                  <div style="display: flex; flex-direction: column; align-items: center; gap: 6px;">
                    <div style="width: 48px; height: 48px; background: rgba(255,255,255,0.2); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px;">📝</div>
                    <div style="font-size: 11px; color: white; opacity: 0.95; text-align: center; line-height: 1.3;">Export to<br>Formats</div>
                  </div>
                </div>
                <div style="background: white; color: #667eea; padding: 18px 36px; border-radius: 10px; font-weight: 700; font-size: 16px; white-space: nowrap; box-shadow: 0 6px 20px rgba(0,0,0,0.2); transition: all 0.3s; flex-shrink: 0;">Start Free Trial →</div>
              </div>
            </div>
          </a>`
        }
      ]
    }
  }
};

// Function to render affiliate links
function renderAffiliateLinks(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = AdsConfig.affiliateLinks.map(link => `
    <a href="${link.url}" class="affiliate-link" target="_blank" rel="noopener sponsored">
      ${link.name}
    </a>
  `).join('');
}

// Function to render ad slots
function renderAdSlot(containerId, size) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Google AdSense
  if (AdsConfig.adSlots.adsense.enabled) {
    const slotId = size === '728x90' ? AdsConfig.adSlots.adsense.slots.banner : AdsConfig.adSlots.adsense.slots.rectangle;
    container.innerHTML = `
      <ins class="adsbygoogle"
           style="display:inline-block;width:${size.split('x')[0]}px;height:${size.split('x')[1]}px"
           data-ad-client="${AdsConfig.adSlots.adsense.client}"
           data-ad-slot="${slotId}"></ins>
      <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
    `;
    return;
  }

  // Carbon Ads
  if (AdsConfig.adSlots.carbon.enabled) {
    container.innerHTML = `
      <script async type="text/javascript" src="//cdn.carbonads.com/carbon.js?serve=${AdsConfig.adSlots.carbon.serve}&placement=${AdsConfig.adSlots.carbon.placement}" id="_carbonads_js"></script>
    `;
    return;
  }

  // BuySellAds
  if (AdsConfig.adSlots.buysellads.enabled) {
    container.innerHTML = `
      <div id="bsap_${AdsConfig.adSlots.buysellads.zoneId}" class="bsarocks bsap_${size.replace('x', '')}"></div>
    `;
    return;
  }

  // Direct ads (fallback)
  if (AdsConfig.adSlots.direct.enabled) {
    const ad = AdsConfig.adSlots.direct.ads.find(a => a.size === size);
    if (ad) {
      container.innerHTML = ad.html;
    }
  }
}

// Initialize on page load
if (typeof window !== 'undefined') {
  window.AdsConfig = AdsConfig;
  window.renderAffiliateLinks = renderAffiliateLinks;
  window.renderAdSlot = renderAdSlot;
}
