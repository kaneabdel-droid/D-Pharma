const fs = require('fs');
const dictPath = 'C:/Users/bmd/.antigravity-ide/DEMBA/d-pharma/dictionaries/fr.json';
const dict = JSON.parse(fs.readFileSync(dictPath, 'utf8'));

dict.dashboard.pharma_stats = {
    sales_today: 'Ventes du jour',
    sales_today_desc: 'Chiffre d\'affaires',
    low_stock: 'Stock Faible',
    low_stock_desc: 'Médicaments à réapprovisionner',
    pending_orders: 'Commandes Labo',
    pending_orders_desc: 'En attente',
    expired: 'Périmés ou proches',
    expired_desc: 'À retirer des rayons'
};
dict.dashboard.welcome = 'Bienvenue sur D-PHARMA. Voici un résumé de votre officine.';
dict.dashboard.recent_sales = {
    title: 'Dernières ventes',
    empty: 'Aucune vente récente',
    pos_link: 'Aller au Point de Vente',
    sale_of: 'Ticket N°'
};

fs.writeFileSync(dictPath, JSON.stringify(dict, null, 2));
