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
});
