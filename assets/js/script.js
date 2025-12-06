/**
 * Fichier: script.js
 * Description: Logique principale de l'application Nettoyeur de Noms de Fichiers
 * Architecture: 777
 * Auteur: 777 Tools
 */

// ============================================================================
// CONFIGURATION ET DONNÉES
// ============================================================================

/**
 * Ensemble des caractères invalides par défaut à supprimer des noms de fichiers
 * Inclut: émoticônes, caractères spéciaux, ponctuation et espaces problématiques
 */
let invalidChars = new Set([
    // Émoticônes et symboles
    '☺', '☻', '♥', '♦', '♣', '♠', '•', '◘', '○', '◙', '♂', '♀', '♪', '♫', '☼',
    '►', '◄', '↕', '‼', '¶', '§', '▬', '↨', '↑', '↓', '→', '←', '∟', '↔', '▲', '▼',
    '★', '☆', '✰', '✦', '✧', '❄', '❆', '❖', '✿', '❀', '❁', '❤', '➤', '➥', '➦',
    
    // Caractères spéciaux problématiques pour les systèmes de fichiers
    '\\', '/', ':', '*', '?', '"', '<', '>', '|', '#', '²', '~', '`', '´',
    
    // Ponctuation et symboles (sauf le point qui fait partie de l'extension)
    ',', ';', '!', '(', ')', '[', ']', '{', '}', '@', '&', '$', '%', '^',
    '+', '=', '§', '°', '¨', '£', '€', '¥',
    
    // Caractères de contrôle
    '\t', '\n', '\r'
]);

// ============================================================================
// FONCTIONS D'AFFICHAGE
// ============================================================================

/**
 * Affiche la liste des caractères invalides dans l'interface
 * Trie les caractères pour un affichage cohérent et les rend dans le DOM
 */
function displayInvalidChars() {
    const charList = document.getElementById('charactersList');
    if (!charList) return;
    
    // Vider la liste actuelle
    charList.innerHTML = '';
    
    // Convertir l'ensemble en tableau et trier
    const sortedChars = Array.from(invalidChars).sort();
    
    // Créer un élément de liste pour chaque caractère
    sortedChars.forEach(char => {
        const li = document.createElement('li');
        
        // Gérer les caractères spéciaux pour l'affichage
        if (char === ' ') {
            li.textContent = '[espace]';
            li.setAttribute('title', 'Espace');
        } else if (char === '\t') {
            li.textContent = '[tabulation]';
            li.setAttribute('title', 'Tabulation');
        } else if (char === '\n' || char === '\r') {
            li.textContent = '[retour]';
            li.setAttribute('title', 'Retour à la ligne');
        } else {
            li.textContent = char;
        }
        
        li.setAttribute('aria-label', `Caractère à remplacer par un espace: ${char}`);
        charList.appendChild(li);
    });
}

/**
 * Met à jour le compteur de caractères dans la zone de texte
 */
function updateCharCount() {
    const customCharsInput = document.getElementById('customChars');
    const charCountElement = document.getElementById('charCount');
    
    if (!customCharsInput || !charCountElement) return;
    
    const text = customCharsInput.value;
    
    // Compter les caractères uniques (en ignorant les doublons)
    const uniqueChars = new Set();
    for (let char of text) {
        uniqueChars.add(char);
    }
    
    const count = uniqueChars.size;
    charCountElement.textContent = count;
    
    // Changer la couleur en fonction du nombre
    if (count === 0) {
        charCountElement.style.color = '#6c757d';
    } else if (count <= 10) {
        charCountElement.style.color = '#28a745';
    } else {
        charCountElement.style.color = '#dc3545';
    }
}

// ============================================================================
// FONCTIONS DE TRAITEMENT DES FICHIERS
// ============================================================================

/**
 * Nettoie un nom de fichier en remplaçant les caractères invalides par des espaces
 * @param {string} fileName - Le nom de fichier original à nettoyer
 * @returns {string} Le nom de fichier nettoyé
 */
function cleanFileName(fileName) {
    if (!fileName || typeof fileName !== 'string') {
        return 'fichier_sans_nom';
    }
    
    // Trouver la position du dernier point pour séparer l'extension
    const lastDotIndex = fileName.lastIndexOf('.');
    let name = fileName;
    let extension = '';
    
    // Conserver l'extension si elle existe
    if (lastDotIndex !== -1 && lastDotIndex > 0) {
        name = fileName.substring(0, lastDotIndex);
        extension = fileName.substring(lastDotIndex);
    }
    
    let cleanedName = name;
    
    // Remplacer chaque caractère invalide par un espace
    invalidChars.forEach(char => {
        // Échapper les caractères spéciaux pour les expressions régulières
        const escapedChar = char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedChar, 'g');
        cleanedName = cleanedName.replace(regex, ' ');
    });
    
    // Nettoyer les espaces multiples et les espaces en début/fin
    cleanedName = cleanedName.replace(/\s+/g, ' ').trim();
    
    // Remplacer les espaces par des underscores si demandé
    const useUnderscores = document.getElementById('useUnderscores')?.checked || false;
    if (useUnderscores) {
        cleanedName = cleanedName.replace(/\s+/g, '_');
    }
    
    // Convertir en minuscules si demandé
    const useLowercase = document.getElementById('useLowercase')?.checked || false;
    if (useLowercase) {
        cleanedName = cleanedName.toLowerCase();
    }
    
    // Si le nom est vide après nettoyage, utiliser un nom par défaut
    if (cleanedName === '') {
        cleanedName = 'fichier';
    }
    
    // Retourner le nom nettoyé avec son extension
    return cleanedName + extension;
}

/**
 * Nettoie tous les noms de fichiers fournis et affiche les résultats
 * Lit les noms de fichiers depuis la zone de texte, les nettoie et affiche les résultats
 */
function cleanAllFileNames() {
    const fileNamesInput = document.getElementById('fileNames');
    const resultBox = document.getElementById('resultBox');
    
    if (!fileNamesInput || !resultBox) return;
    
    // Récupérer et nettoyer les noms de fichiers
    const fileNames = fileNamesInput.value.split('\n');
    const validFileNames = fileNames
        .map(name => name.trim())
        .filter(name => name !== '');
    
    // Vérifier si des noms ont été fournis
    if (validFileNames.length === 0) {
        resultBox.innerHTML = `
            <div class="warning" style="margin: 0;">
                <p>Veuillez entrer au moins un nom de fichier à nettoyer.</p>
            </div>
        `;
        return;
    }
    
    // Traiter chaque nom de fichier
    let resultsHTML = '';
    let hasChanges = false;
    let processedCount = 0;
    
    validFileNames.forEach(originalName => {
        const cleanedName = cleanFileName(originalName);
        
        // Vérifier si des modifications ont été apportées
        if (cleanedName !== originalName) {
            hasChanges = true;
        }
        
        // Générer le HTML pour ce fichier
        resultsHTML += `
            <div class="file-item" role="listitem">
                <div class="original-name" aria-label="Nom original: ${originalName}">
                    ${escapeHtml(originalName)}
                </div>
                <div class="cleaned-name" aria-label="Nom nettoyé: ${cleanedName}">
                    ${escapeHtml(cleanedName)}
                    ${cleanedName !== originalName ? 
                        `<span class="change-indicator" title="Caractères remplacés par des espaces">↝</span>` : 
                        ''}
                </div>
            </div>
        `;
        
        processedCount++;
    });
    
    // Ajouter un résumé des traitements
    const summary = `
        <div class="file-item" style="background-color: #e9ecef; border-left-color: #6c757d;">
            <div class="original-name">
                <strong>Traitement terminé:</strong> ${processedCount} fichier(s) traité(s)
            </div>
            <div class="cleaned-name">
                ${hasChanges ? 'Caractères invalides remplacés par des espaces' : 'Aucun caractère invalide trouvé'}
            </div>
        </div>
    `;
    
    // Afficher les résultats
    resultBox.innerHTML = summary + resultsHTML;
    
    // Annoncer les résultats pour les lecteurs d'écran
    announceToScreenReader(`${processedCount} fichiers traités. ${hasChanges ? 'Caractères invalides remplacés par des espaces.' : 'Aucun changement nécessaire.'}`);
}

// ============================================================================
// FONCTIONS D'EXPORT ET D'IMPORT
// ============================================================================

/**
 * Exporte les résultats nettoyés dans un fichier texte
 * Crée un fichier texte téléchargeable contenant tous les noms de fichiers nettoyés
 */
function exportResults() {
    const resultItems = document.querySelectorAll('.cleaned-name');
    
    // Vérifier s'il y a des résultats à exporter
    if (resultItems.length === 0) {
        showNotification('Veuillez d\'abord nettoyer des noms de fichiers avant d\'exporter.', 'warning');
        return;
    }
    
    // Collecter tous les noms nettoyés (sans l'indicateur de changement)
    let exportText = '';
    resultItems.forEach(item => {
        const text = item.textContent.replace('↝', '').trim();
        if (text && !text.includes('Traitement terminé')) {
            exportText += text + '\n';
        }
    });
    
    // Créer le blob et le lien de téléchargement
    const blob = new Blob([exportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `noms_fichiers_nettoyes_${timestamp}.txt`;
    
    // Créer et déclencher le téléchargement
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    
    document.body.appendChild(a);
    a.click();
    
    // Nettoyer
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showNotification('Export terminé ! Fichier téléchargé.', 'success');
    }, 100);
}

/**
 * Ajoute des caractères personnalisés à la liste des caractères à supprimer
 * Lit les caractères depuis la zone de texte et les ajoute à l'ensemble
 */
function addCustomChars() {
    const customCharsInput = document.getElementById('customChars');
    
    if (!customCharsInput || customCharsInput.value.trim() === '') {
        showNotification('Veuillez entrer des caractères à ajouter.', 'warning');
        return;
    }
    
    const customChars = customCharsInput.value;
    const uniqueChars = new Set();
    let addedCount = 0;
    
    // Collecter les caractères uniques
    for (let char of customChars) {
        uniqueChars.add(char);
    }
    
    // Ajouter chaque caractère unique qui n'est pas déjà dans la liste
    uniqueChars.forEach(char => {
        if (!invalidChars.has(char)) {
            invalidChars.add(char);
            addedCount++;
        }
    });
    
    // Mettre à jour l'affichage et notifier l'utilisateur
    displayInvalidChars();
    customCharsInput.value = '';
    updateCharCount(); // Réinitialiser le compteur
    
    showNotification(`${addedCount} caractère(s) unique(s) ajouté(s) à la liste. Ils seront remplacés par des espaces.`, 'success');
}

/**
 * Réinitialise la liste des caractères à supprimer aux valeurs par défaut
 * Demande confirmation avant de réinitialiser
 */
function resetCharList() {
    if (!confirm('Êtes-vous sûr de vouloir réinitialiser la liste des caractères à remplacer ?')) {
        return;
    }
    
    // Réinitialiser à la liste par défaut
    invalidChars = new Set([
        '☺', '☻', '♥', '♦', '♣', '♠', '•', '◘', '○', '◙', '♂', '♀', '♪', '♫', '☼',
        '►', '◄', '↕', '‼', '¶', '§', '▬', '↨', '↑', '↓', '→', '←', '∟', '↔', '▲', '▼',
        '★', '☆', '✰', '✦', '✧', '❄', '❆', '❖', '✿', '❀', '❁', '❤', '➤', '➥', '➦',
        '\\', '/', ':', '*', '?', '"', '<', '>', '|', '#', '²', '~', '`', '´',
        ',', ';', '!', '(', ')', '[', ']', '{', '}', '@', '&', '$', '%', '^',
        '+', '=', '§', '°', '¨', '£', '€', '¥',
        '\t', '\n', '\r'
    ]);
    
    displayInvalidChars();
    showNotification('Liste des caractères réinitialisée avec succès.', 'success');
}

// ============================================================================
// FONCTIONS UTILITAIRES
// ============================================================================

/**
 * Échappe les caractères HTML pour prévenir les attaques XSS
 * @param {string} text - Texte à échapper
 * @returns {string} Texte échappé
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Affiche une notification temporaire à l'utilisateur
 * @param {string} message - Message à afficher
 * @param {string} type - Type de notification ('success', 'warning', 'error')
 */
function showNotification(message, type = 'info') {
    // Créer l'élément de notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.setAttribute('role', 'alert');
    notification.setAttribute('aria-live', 'assertive');
    
    // Styles pour la notification
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
        max-width: 350px;
    `;
    
    // Couleurs selon le type
    const colors = {
        success: '#28a745',
        warning: '#ffc107',
        error: '#dc3545',
        info: '#17a2b8'
    };
    
    notification.style.backgroundColor = colors[type] || colors.info;
    
    // Ajouter au document
    document.body.appendChild(notification);
    
    // Supprimer après 3 secondes
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

/**
 * Annonce un message aux lecteurs d'écran
 * @param {string} message - Message à annoncer
 */
function announceToScreenReader(message) {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    
    // Utiliser un timeout pour s'assurer que le message est annoncé
    setTimeout(() => {
        announcement.textContent = message;
        document.body.appendChild(announcement);
        
        setTimeout(() => {
            if (announcement.parentNode) {
                document.body.removeChild(announcement);
            }
        }, 100);
    }, 100);
}

/**
 * Initialise l'application avec des données d'exemple
 * Remplit la zone de texte avec des exemples pour aider l'utilisateur
 */
function initializeWithExamples() {
    const fileNamesInput = document.getElementById('fileNames');
    if (!fileNamesInput) return;
    
    // Données d'exemple avec différents types de caractères problématiques
    const examples = [
        'Mon Fichier☺.txt',
        'Photo@vacances#1.jpg',
        'Document² (copie).pdf',
        'Rapport:financier/2023.xlsx',
        'Carte\\d\'accès<confidentielle>.png',
        'C.V._Marie&Jean.docx',
        'Projet★Spécial🎵.mp3',
        'Fichier avec  espaces   multiples.txt',
        'Élément:Important⚠️.doc',
        'Backup/archive.zip',
        'Fichier*avec?caractères|spéciaux.txt',
        'Rapport<final>.docx',
        'Photo[2023].jpg',
        'Musique♪de♪fond.mp3',
        'Document ♥ spécial ♥ v2.pdf'
    ];
    
    fileNamesInput.value = examples.join('\n');
    showNotification('Exemples chargés. Caractères invalides seront remplacés par des espaces.', 'info');
}

// ============================================================================
// INITIALISATION DE L'APPLICATION
// ============================================================================

/**
 * Initialise l'application quand le DOM est chargé
 * Configure les écouteurs d'événements et initialise les composants
 */
function initApp() {
    // Afficher la liste des caractères invalides
    displayInvalidChars();
    
    // Configurer les écouteurs d'événements pour les boutons
    document.getElementById('cleanBtn')?.addEventListener('click', cleanAllFileNames);
    document.getElementById('exportBtn')?.addEventListener('click', exportResults);
    document.getElementById('addCharsBtn')?.addEventListener('click', addCustomChars);
    document.getElementById('resetCharsBtn')?.addEventListener('click', resetCharList);
    document.getElementById('clearBtn')?.addEventListener('click', clearFileList);
    
    // Configurer le compteur de caractères
    const customCharsInput = document.getElementById('customChars');
    if (customCharsInput) {
        customCharsInput.addEventListener('input', updateCharCount);
        // Initialiser le compteur
        updateCharCount();
    }
    
    // Configurer les options
    document.getElementById('useUnderscores')?.addEventListener('change', () => {
        if (document.querySelector('.file-item')) {
            cleanAllFileNames(); // Re-nettoyer si des résultats sont affichés
        }
    });
    
    document.getElementById('useLowercase')?.addEventListener('change', () => {
        if (document.querySelector('.file-item')) {
            cleanAllFileNames(); // Re-nettoyer si des résultats sont affichés
        }
    });
    
    // Ajouter des exemples au chargement
    initializeWithExamples();
    
    // Ajouter des styles d'animation pour les notifications
    addNotificationStyles();
    
    // Annoncer que l'application est prête
    setTimeout(() => {
        announceToScreenReader('Application Nettoyeur de noms de fichiers chargée. Caractères invalides seront automatiquement remplacés par des espaces.');
    }, 1000);
}

/**
 * Efface la liste des fichiers
 */
function clearFileList() {
    const fileNamesInput = document.getElementById('fileNames');
    const resultBox = document.getElementById('resultBox');
    
    if (fileNamesInput) fileNamesInput.value = '';
    if (resultBox) resultBox.innerHTML = '<p class="placeholder">Les résultats nettoyés apparaîtront ici</p>';
    
    showNotification('Liste des fichiers effacée.', 'info');
}

/**
 * Ajoute les styles CSS pour les animations de notification
 */
function addNotificationStyles() {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
        
        .change-indicator {
            margin-left: 0.5rem;
            color: #28a745;
            font-size: 1.2rem;
            vertical-align: middle;
        }
        
        .char-counter {
            margin-top: 0.5rem;
            font-size: 0.875rem;
            color: #6c757d;
            text-align: right;
        }
        
        .char-counter span {
            font-weight: bold;
        }
    `;
    document.head.appendChild(style);
}

// ============================================================================
// LANCEMENT DE L'APPLICATION
// ============================================================================

// Démarrer l'application quand le DOM est complètement chargé
document.addEventListener('DOMContentLoaded', initApp);

// Support pour les anciens navigateurs
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}