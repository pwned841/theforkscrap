// Écouter les messages du background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Message received in content script:", request);
  
  if (request.action === "extractRestaurantLinks") {
    // Récupération des liens de restaurants
    const restaurantLinks = [];
    
    try {
      // Cibler spécifiquement les liens de restaurants sur TheFork
      const restaurantElements = document.querySelectorAll('a.css-r0c0pd');
      console.log(`Found ${restaurantElements.length} restaurant links`);
      
      restaurantElements.forEach((link) => {
        const href = link.getAttribute('href');
        let restaurantId = null;
        
        // Extraire l'ID du restaurant à partir de l'URL (format: xxx-xxx-rNUMBER ou xxx-xxx-rNUMBER#xxx)
        if (href) {
          const idMatch = href.match(/r(\d+)(?:#|$)/);
          if (idMatch && idMatch[1]) {
            restaurantId = idMatch[1];
          }
        }
        
        restaurantLinks.push({
          name: link.textContent.trim(),
          href: href,
          fullUrl: link.href || new URL(href, window.location.origin).href,
          id: restaurantId
        });
      });
      
      console.log("Restaurant links found:", restaurantLinks);
    } catch (error) {
      console.error("Error extracting restaurant links:", error);
    }
    
    // Envoyer les liens récupérés
    sendResponse({ restaurantLinks });
    return true;
  }
  
  if (request.action === "fetchRestaurantDetails") {
    sendResponse({ status: "Received request to fetch details" });
    return true;
  }
});

// Indiquer que le content script est chargé
console.log("TheFork Restaurant Scraper content script loaded successfully");

// Fonction pour afficher des informations de débogage sur les liens trouvés
function debugRestaurantLinks() {
  const links = document.querySelectorAll('a.css-r0c0pd');
  console.log(`Debug: Found ${links.length} restaurant links on the page`);
  
  links.forEach((link, index) => {
    const href = link.getAttribute('href');
    let id = null;
    if (href) {
      const idMatch = href.match(/r(\d+)(?:#|$)/);
      if (idMatch && idMatch[1]) {
        id = idMatch[1];
      }
    }
    
    console.log(`Restaurant ${index + 1}:`, {
      text: link.textContent.trim(),
      href: href,
      fullUrl: link.href || new URL(href, window.location.origin).href,
      id: id
    });
  });
}

// Exécuter la fonction de débogage après le chargement complet
setTimeout(debugRestaurantLinks, 1000);
