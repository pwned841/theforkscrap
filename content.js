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
        restaurantLinks.push({
          name: link.textContent.trim(),
          href: link.getAttribute('href'),
          fullUrl: link.href || new URL(link.getAttribute('href'), window.location.origin).href
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
});

// Indiquer que le content script est chargé
console.log("TheFork Restaurant Scraper content script loaded successfully");

// Fonction pour afficher des informations de débogage sur les liens trouvés
function debugRestaurantLinks() {
  const links = document.querySelectorAll('a.css-r0c0pd');
  console.log(`Debug: Found ${links.length} restaurant links on the page`);
  
  links.forEach((link, index) => {
    console.log(`Restaurant ${index + 1}:`, {
      text: link.textContent.trim(),
      href: link.getAttribute('href'),
      fullUrl: link.href || new URL(link.getAttribute('href'), window.location.origin).href
    });
  });
}

// Exécuter la fonction de débogage après le chargement complet
setTimeout(debugRestaurantLinks, 1000);
