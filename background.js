chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractRestaurantLinks') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'extractRestaurantLinks' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error sending message to content script:", chrome.runtime.lastError);
          sendResponse({ restaurantLinks: [] });
        } else {
          console.log("Background received restaurant links:", response.restaurantLinks);
          sendResponse({ restaurantLinks: response.restaurantLinks });
        }
      });
      return true; // Indicate that the response will be sent asynchronously
    });
    return true; // Indicate that the response will be sent asynchronously
  }

  if (request.action === "getRestaurantLinks") {
    // Récupérer l'onglet actif
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (chrome.runtime.lastError) {
        console.error("Error getting active tab:", chrome.runtime.lastError);
        sendResponse({ error: "Error getting active tab" });
        return;
      }
      
      const activeTab = tabs[0];
      
      // Vérifier si l'onglet existe
      if (!activeTab || !activeTab.id) {
        console.error("No active tab found");
        sendResponse({ error: "No active tab found" });
        return;
      }
      
      // Envoyer le message au content script
      chrome.tabs.sendMessage(activeTab.id, { action: "extractRestaurantLinks" }, function(response) {
        if (chrome.runtime.lastError) {
          console.error("Error sending message to content script:", chrome.runtime.lastError);
          // Essayons d'injecter le content script s'il n'est pas déjà chargé
          chrome.scripting.executeScript({
            target: { tabId: activeTab.id },
            files: ['content.js']
          }, function() {
            // Réessayons d'envoyer le message après l'injection du script
            chrome.tabs.sendMessage(activeTab.id, { action: "extractRestaurantLinks" }, function(secondResponse) {
              sendResponse(secondResponse || { restaurantLinks: [] });
            });
          });
        } else {
          sendResponse(response);
        }
      });
    });
    
    // Retourner true pour indiquer que sendResponse sera appelé de manière asynchrone
    return true;
  }
  
  if (request.action === "fetchRestaurantDetails") {
    const { restaurantId, restaurantSlug } = request;
    
    if (!restaurantId) {
      sendResponse({ error: "ID de restaurant manquant" });
      return true;
    }
    
    fetchRestaurantTraderInfo(restaurantId, restaurantSlug)
      .then(data => {
        console.log(`Restaurant ${restaurantId} details fetched:`, data);
        sendResponse({ success: true, data });
      })
      .catch(error => {
        console.error(`Error fetching details for restaurant ${restaurantId}:`, error);
        sendResponse({ success: false, error: error.message });
      });
    
    return true; // Indicate that the response will be sent asynchronously
  }
});

// Fonction pour récupérer les détails du restaurant via l'API GraphQL
async function fetchRestaurantTraderInfo(restaurantId, restaurantSlug) {
  const url = 'https://www.thefork.fr/api/graphql';
  
  // Récupérer les cookies du site TheFork
  const cookiesPromise = new Promise((resolve) => {
    chrome.cookies.getAll({ domain: "www.thefork.fr" }, (cookies) => {
      const cookieString = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
      resolve(cookieString);
    });
  });
  
  const cookieString = await cookiesPromise;
  console.log("Cookies for TheFork:", cookieString ? "Retrieved successfully" : "None found");
  
  const headers = {
    'accept': '*/*',
    'accept-language': 'fr-FR',
    'apollographql-client-name': 'core-front-browser',
    'content-type': 'application/json',
    'cookie': cookieString,
    'origin': 'https://www.thefork.fr',
    'priority': 'u=1, i',
    'referer': `https://www.thefork.fr/restaurant/${restaurantSlug || ''}`,
    'sec-ch-ua': '"Not A(Brand";v="8", "Chromium";v="132", "Opera";v="117"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'timezone': 'Europe/Paris',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36 OPR/117.0.0.0',
    'x-caller-name': '',
    'x-request-id': '',
    'x-request-id-stack': '',
    'x-tf-ab-test': 'fake_dhp_top_100=in;is_ps_for_sr_ps=ispsrpv;is_ps_on_rp=isprpv;otp_second_device=in',
    'x-thefork-product-id': '37',
    'x-thefork-product-name': 'core-front-browser'
  };
  
  const payload = [{
    operationName: "RestaurantTraderInfo",
    variables: {
      restaurantId: restaurantId
    },
    query: "query RestaurantTraderInfo($restaurantId: ID!) {\\n  restaurant(restaurantId: $restaurantId) {\\n    id\\n    name\\n    phone\\n    address {\\n      locality\\n      zipCode\\n      street\\n      __typename\\n    }\\n    legal {\\n      privacyPolicyUrl\\n      registerName\\n      registerNumber\\n      unionLawCompliance\\n      website\\n      email\\n      __typename\\n    }\\n    __typename\\n  }\\n}"
  }];
  
  try {
    console.log(`Fetching details for restaurant ID: ${restaurantId}`);
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload),
      credentials: 'include'
    });
    
    if (!response.ok) {
      console.error(`API response error: ${response.status} ${response.statusText}`);
      throw new Error(`HTTP error: ${response.status}`);
    }
    
    const result = await response.json();
    console.log("API response:", result);
    
    // Vérifier si la réponse contient des données
    if (result && result[0] && result[0].data && result[0].data.restaurant) {
      return result[0].data.restaurant;
    } else if (result && result[0] && result[0].errors) {
      throw new Error(result[0].errors[0].message || "Error retrieving data");
    } else {
      throw new Error("Unexpected response format");
    }
  } catch (error) {
    console.error("Error in fetchRestaurantTraderInfo:", error);
    throw error;
  }
}
