// Backend API Configuration
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:3001' 
    : 'https://crazytyper.onrender.com';

// DOM Elements
const generateForm = document.getElementById('textGeneratorForm');
const transformForm = document.getElementById('textTransformForm');
const generateBtn = document.getElementById('generateBtn');
const transformBtn = document.getElementById('transformBtn');
const btnText = document.getElementById('btnText');
const btnLoading = document.getElementById('btnLoading');
const transformBtnText = document.getElementById('transformBtnText');
const transformBtnLoading = document.getElementById('transformBtnLoading');
const outputSection = document.getElementById('outputSection');
const typewriterOutput = document.getElementById('typewriterOutput');
const errorSection = document.getElementById('errorSection');
const errorMessage = document.getElementById('errorMessage');
const copyBtn = document.getElementById('copyBtn');
const printBtn = document.getElementById('printBtn');
const pdfBtn = document.getElementById('pdfBtn');
const regenerateBtn = document.getElementById('regenerateBtn');

// Tab elements
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// Typewriter imperfection settings
const imperfectionTypes = {
    minimal: {
        typoChance: 0.001,
        fadedChance: 0.005,
        heavyChance: 0.003,
        unevenChance: 0.002,
        spacingChance: 0.002,
        stuckKeyChance: 0.0005
    },
    light: {
        typoChance: 0.005,
        fadedChance: 0.02,
        heavyChance: 0.01,
        unevenChance: 0.015,
        spacingChance: 0.01,
        stuckKeyChance: 0.002
    },
    medium: {
        typoChance: 0.01,
        fadedChance: 0.04,
        heavyChance: 0.025,
        unevenChance: 0.03,
        spacingChance: 0.02,
        stuckKeyChance: 0.005
    },
    heavy: {
        typoChance: 0.02,
        fadedChance: 0.06,
        heavyChance: 0.04,
        unevenChance: 0.05,
        spacingChance: 0.035,
        stuckKeyChance: 0.01
    }
};

// Common typewriter typos and character substitutions
const commonTypos = {
    'e': ['3', 'r', 'w'],
    'r': ['t', 'e', 'f'],
    't': ['y', 'r', 'g'],
    'y': ['t', 'u', 'h'],
    'u': ['i', 'y', 'j'],
    'i': ['o', 'u', 'k'],
    'o': ['p', 'i', 'l'],
    'p': ['o', 'l', ';'],
    'a': ['s', 'q'],
    's': ['d', 'a', 'w'],
    'd': ['f', 's', 'e'],
    'f': ['g', 'd', 'r'],
    'g': ['h', 'f', 't'],
    'h': ['j', 'g', 'y'],
    'j': ['k', 'h', 'u'],
    'k': ['l', 'j', 'i'],
    'l': ['k', 'o', ';'],
    'z': ['x', 'a'],
    'x': ['c', 'z', 's'],
    'c': ['v', 'x', 'd'],
    'v': ['b', 'c', 'f'],
    'b': ['n', 'v', 'g'],
    'n': ['m', 'b', 'h'],
    'm': ['n', 'j']
};

// Words that might get stuck keys (repeated letters)
const stuckKeyWords = ['the', 'and', 'that', 'with', 'have', 'this', 'will', 'your', 'from', 'they'];

// Request management
let currentController = null;

// Event listeners
generateForm.addEventListener('submit', handleGenerateSubmit);
transformForm.addEventListener('submit', handleTransformSubmit);
copyBtn.addEventListener('click', copyToClipboard);
printBtn.addEventListener('click', printDocument);
pdfBtn.addEventListener('click', exportToPDF);
regenerateBtn.addEventListener('click', regenerateText);

// Tab switching
tabButtons.forEach(button => {
    button.addEventListener('click', () => switchTab(button.dataset.tab));
});

// Initialize tabs
switchTab('generate');

// Custom font management
let customFonts = {};

// Font select change handlers
document.getElementById('fontSelect').addEventListener('change', handleFontSelectChange);
document.getElementById('fontSelectTransform').addEventListener('change', handleFontSelectChangeTransform);

// Length select change handler
document.getElementById('pageLength').addEventListener('change', handleLengthSelectChange);

// Custom font upload handlers
document.getElementById('customFontUpload').addEventListener('change', handleCustomFontUpload);
document.getElementById('customFontUploadTransform').addEventListener('change', handleCustomFontUploadTransform);

// Tab switching function
function switchTab(tabName) {
    // Update tab buttons
    tabButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        }
    });
    
    // Update tab content
    tabContents.forEach(content => {
        content.classList.remove('active');
        if (content.id === tabName + 'Tab') {
            content.classList.add('active');
        }
    });
}

async function handleGenerateSubmit(e) {
    e.preventDefault();
    
    const prompt = document.getElementById('textPrompt').value;
    const pageLength = document.getElementById('pageLength').value;
    const timeEra = document.getElementById('timeEra').value;
    
    if (!prompt.trim()) {
        showError('Please describe what the text should be about.');
        return;
    }
    
    setLoading('generate', true);
    hideError();
    hideOutput();
    
    try {
        const generatedText = await generateText(prompt, pageLength, timeEra);
        displayTypewriterText(generatedText, 'generate');
    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('Request was cancelled');
            return; // Don't show error for cancelled requests
        }
        console.error('Error generating text:', error);
        showError('Failed to generate text. Please check your API key and try again.');
    } finally {
        setLoading('generate', false);
    }
}

async function handleTransformSubmit(e) {
    e.preventDefault();
    
    const userText = document.getElementById('userText').value;
    
    if (!userText.trim()) {
        showError('Please paste or type some text to transform.');
        return;
    }
    
    setLoading('transform', true);
    hideError();
    hideOutput();
    
    try {
        displayTypewriterText(userText, 'transform');
    } catch (error) {
        console.error('Error transforming text:', error);
        showError('Failed to transform text. Please try again.');
    } finally {
        setLoading('transform', false);
    }
}

async function generateText(prompt, pageLength, timeEra) {
    // Cancel previous request if any
    if (currentController) {
        currentController.abort();
    }
    
    // Create new AbortController for this request
    currentController = new AbortController();
    
    // Handle custom word count
    if (pageLength === 'custom') {
        const customWordCount = document.getElementById('customWordCount').value;
        if (!customWordCount || customWordCount < 50) {
            throw new Error('Please enter a valid word count (minimum 50)');
        }
    }

    const response = await fetch(`${API_BASE_URL}/api/generate-text`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            prompt: prompt.trim(),
            pageLength: pageLength,
            timeEra: timeEra
        }),
        signal: currentController.signal
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 429) {
            throw new Error('Too many requests. Please wait a moment and try again.');
        } else if (response.status === 400) {
            throw new Error(errorData.error || 'Invalid request. Please check your input.');
        } else if (response.status >= 500) {
            throw new Error('Server error. Please try again later.');
        } else {
            throw new Error(`API error: ${response.status}`);
        }
    }

    const data = await response.json();
    return data.text;
}

function displayTypewriterText(text, mode) {
    let fontSelect, errorLevel;
    
    if (mode === 'generate') {
        fontSelect = document.getElementById('fontSelect');
        errorLevel = document.getElementById('errorLevel').value;
    } else {
        fontSelect = document.getElementById('fontSelectTransform');
        errorLevel = document.getElementById('errorLevelTransform').value;
    }
    
    console.log('displayTypewriterText debug:', {
        mode,
        fontSelectValue: fontSelect.value,
        customFonts,
        hasCustomFontForMode: customFonts[mode]
    });
    
    // Apply font class
    typewriterOutput.className = 'typewriter-output brutal-typewriter font-' + fontSelect.value;
    
    // If custom font is selected, also apply the custom font class
    if (fontSelect.value === 'custom' && customFonts[mode]) {
        typewriterOutput.classList.add('font-custom');
        console.log('Applied custom font class for mode:', mode, customFonts[mode].name);
    }
    
    // Apply typewriter imperfections
    const imperfectedText = applyTypewriterImperfections(text, errorLevel);
    
    // Display the text with a typing animation
    animateTyping(imperfectedText);
    
    showOutput();
}

function applyTypewriterImperfections(text, level) {
    const settings = imperfectionTypes[level];
    let result = '';
    const words = text.split(/(\s+)/);
    
    for (let wordIndex = 0; wordIndex < words.length; wordIndex++) {
        const word = words[wordIndex];
        
        // Skip whitespace
        if (/^\s+$/.test(word)) {
            result += word;
            continue;
        }
        
        let processedWord = '';
        
        // Check for stuck key (repeat a word occasionally)
        if (Math.random() < settings.stuckKeyChance && stuckKeyWords.includes(word.toLowerCase())) {
            processedWord += word + word; // Repeat the word
        } else {
            // Process each character
            for (let i = 0; i < word.length; i++) {
                let char = word[i];
                
                // Apply typos
                if (Math.random() < settings.typoChance && commonTypos[char.toLowerCase()]) {
                    const typos = commonTypos[char.toLowerCase()];
                    char = typos[Math.floor(Math.random() * typos.length)];
                    if (word[i] === word[i].toUpperCase() && char !== char.toUpperCase()) {
                        char = char.toUpperCase();
                    }
                }
                
                // Wrap character with imperfection classes
                let classes = [];
                
                if (Math.random() < settings.fadedChance) {
                    classes.push('char-faded');
                }
                
                if (Math.random() < settings.heavyChance) {
                    classes.push('char-heavy');
                }
                
                if (Math.random() < settings.unevenChance) {
                    classes.push(Math.random() < 0.5 ? 'char-uneven' : 'char-uneven-down');
                }
                
                if (Math.random() < settings.spacingChance) {
                    classes.push(Math.random() < 0.5 ? 'char-spaced' : 'char-tight');
                }
                
                if (classes.length > 0) {
                    processedWord += `<span class="${classes.join(' ')}">${char}</span>`;
                } else {
                    processedWord += char;
                }
            }
        }
        
        result += processedWord;
    }
    
    return result;
}

function animateTyping(text) {
    const optimization = optimizeTextProcessing(text);
    
    if (!optimization.animate) {
        // For very large texts, skip animation
        typewriterOutput.innerHTML = text;
        return;
    }
    
    typewriterOutput.innerHTML = '';
    let index = 0;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = text;
    const characters = Array.from(tempDiv.childNodes).flatMap(node => {
        if (node.nodeType === Node.TEXT_NODE) {
            return Array.from(node.textContent);
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            return [node.outerHTML];
        }
        return [];
    });
    
    function typeNextChar() {
        if (index < characters.length) {
            const char = characters[index];
            if (char.startsWith('<span')) {
                typewriterOutput.innerHTML += char;
            } else {
                typewriterOutput.innerHTML += char;
            }
            index++;
            
            // Vary typing speed based on optimization level
            const baseDelay = optimization.animationSpeed || 30;
            const delay = Math.random() * baseDelay + (baseDelay * 0.3);
            setTimeout(typeNextChar, delay);
        }
    }
    
    typeNextChar();
}

async function regenerateText() {
    // Determine which tab is active
    const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
    
    if (activeTab === 'generate') {
        const prompt = document.getElementById('textPrompt').value;
        const pageLength = document.getElementById('pageLength').value;
        const timeEra = document.getElementById('timeEra').value;
        
        if (!prompt.trim()) {
            showError('Please enter a prompt first.');
            return;
        }
        
        setLoading('generate', true);
        hideError();
        
        try {
            const generatedText = await generateText(prompt, pageLength, timeEra);
            displayTypewriterText(generatedText, 'generate');
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Request was cancelled');
                return; // Don't show error for cancelled requests
            }
            console.error('Error regenerating text:', error);
            showError('Failed to regenerate text. Please try again.');
        } finally {
            setLoading('generate', false);
        }
    } else {
        const userText = document.getElementById('userText').value;
        
        if (!userText.trim()) {
            showError('Please enter some text first.');
            return;
        }
        
        setLoading('transform', true);
        hideError();
        
        try {
            displayTypewriterText(userText, 'transform');
        } catch (error) {
            console.error('Error retransforming text:', error);
            showError('Failed to retransform text. Please try again.');
        } finally {
            setLoading('transform', false);
        }
    }
}

function copyToClipboard() {
    const textToCopy = typewriterOutput.innerText || typewriterOutput.textContent;
    
    if (navigator.clipboard) {
        navigator.clipboard.writeText(textToCopy).then(() => {
            showTemporaryMessage(copyBtn, 'Copied!');
        }).catch(() => {
            fallbackCopyToClipboard(textToCopy);
        });
    } else {
        fallbackCopyToClipboard(textToCopy);
    }
}

function fallbackCopyToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        document.execCommand('copy');
        showTemporaryMessage(copyBtn, 'Copied!');
    } catch (err) {
        showTemporaryMessage(copyBtn, 'Copy failed');
    }
    
    document.body.removeChild(textArea);
}

function printDocument() {
    // Ensure the output is visible and ready for printing
    const outputElement = document.querySelector('.typewriter-output');
    
    if (!outputElement || !outputElement.textContent.trim()) {
        alert('No content to print. Please generate or transform some text first.');
        return;
    }
    
    // Add a small delay to ensure styles are applied
    setTimeout(() => {
        window.print();
    }, 100);
}

function exportToPDF() {
    const outputElement = document.querySelector('.typewriter-output');
    
    if (!outputElement || !outputElement.textContent.trim()) {
        alert('No content to export. Please generate or transform some text first.');
        return;
    }
    
    // Show loading message
    showTemporaryMessage(pdfBtn, 'Generating PDF...');
    
    // Get the clean text content (remove HTML formatting for PDF)
    const textContent = outputElement.innerText || outputElement.textContent;
    
    // Get current font selection
    const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
    const fontSelect = activeTab === 'generate' 
        ? document.getElementById('fontSelect') 
        : document.getElementById('fontSelectTransform');
    const selectedFont = fontSelect.value;
    
    // Determine which font to use in PDF
    let pdfFont = 'courier'; // default jsPDF font
    let fontName = 'Courier New';
    
    // Map our font selections to jsPDF compatible fonts
    const fontMap = {
        'courier-prime': { font: 'courier', name: 'Courier Prime' },
        'space-mono': { font: 'courier', name: 'Space Mono (Courier fallback)' },
        'jetbrains-mono': { font: 'courier', name: 'JetBrains Mono (Courier fallback)' },
        'source-code-pro': { font: 'courier', name: 'Source Code Pro (Courier fallback)' },
        'ibm-plex-mono': { font: 'courier', name: 'IBM Plex Mono (Courier fallback)' },
        // Typewriter fonts - use courier as base
        'jmh-typewriter': { font: 'courier', name: 'JMH Typewriter (Courier base)' },
        'jmh-typewriter-black': { font: 'courier', name: 'JMH Typewriter Black (Courier base)' },
        'jmh-typewriter-fine': { font: 'courier', name: 'JMH Typewriter Fine (Courier base)' },
        'elegant-typewriter': { font: 'courier', name: 'Elegant Typewriter (Courier base)' },
        'tt2020-base': { font: 'courier', name: 'TT2020 Base (Courier base)' },
        'tt2020-style-g': { font: 'courier', name: 'TT2020 Style G (Courier base)' },
        'tox-typewriter': { font: 'courier', name: 'Tox Typewriter (Courier base)' },
        'traveling-typewriter': { font: 'courier', name: 'Traveling Typewriter (Courier base)' },
        'gabriele-bad': { font: 'courier', name: 'Gabriele Bad (Courier base)' },
        // Effect variants - Basic
        'jmh-typewriter-cross': { font: 'courier', name: 'JMH Cross Effect (Courier base)' },
        'jmh-typewriter-over': { font: 'courier', name: 'JMH Over Effect (Courier base)' },
        'jmh-typewriter-under': { font: 'courier', name: 'JMH Under Effect (Courier base)' },
        // Black variants with effects
        'jmh-typewriter-black-cross': { font: 'courier', name: 'JMH Black Cross (Courier base)' },
        'jmh-typewriter-black-over': { font: 'courier', name: 'JMH Black Over (Courier base)' },
        'jmh-typewriter-black-under': { font: 'courier', name: 'JMH Black Under (Courier base)' },
        // Fine variants with effects
        'jmh-typewriter-fine-cross': { font: 'courier', name: 'JMH Fine Cross (Courier base)' },
        'jmh-typewriter-fine-over': { font: 'courier', name: 'JMH Fine Over (Courier base)' },
        'jmh-typewriter-fine-under': { font: 'courier', name: 'JMH Fine Under (Courier base)' },
        // Bold variants with effects
        'jmh-typewriter-bold-cross': { font: 'courier', name: 'JMH Bold Cross (Courier base)' },
        'jmh-typewriter-bold-over': { font: 'courier', name: 'JMH Bold Over (Courier base)' },
        'jmh-typewriter-bold-under': { font: 'courier', name: 'JMH Bold Under (Courier base)' }
    };
    
    if (fontMap[selectedFont]) {
        pdfFont = fontMap[selectedFont].font;
        fontName = fontMap[selectedFont].name;
    }
    
    try {
        // Create new jsPDF instance - handle different ways jsPDF might be exposed
        let jsPDFClass = null;
        
        if (window.jspdf && window.jspdf.jsPDF) {
            jsPDFClass = window.jspdf.jsPDF;
        } else if (window.jsPDF) {
            jsPDFClass = window.jsPDF;
        } else if (typeof jsPDF !== 'undefined') {
            jsPDFClass = jsPDF;
        } else {
            throw new Error('jsPDF library not found. Please refresh the page.');
        }
        
        const doc = new jsPDFClass({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });
        
        // Set font
        doc.setFont(pdfFont);
        doc.setFontSize(11);
        
        // Add title/header
        doc.setFontSize(14);
        doc.text('CrazyTyper Document', 20, 20);
        doc.setFontSize(8);
        doc.text(`Font: ${fontName}`, 20, 27);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 32);
        
        // Add separator line
        doc.line(20, 35, 190, 35);
        
        // Reset font size for content
        doc.setFontSize(11);
        
        // Split text into lines that fit the page width
        const pageWidth = 190 - 40; // A4 width minus margins
        const lineHeight = 6;
        let currentY = 45;
        
        // Split text by paragraphs first
        const paragraphs = textContent.split(/\n\s*\n/);
        
        paragraphs.forEach((paragraph, pIndex) => {
            if (paragraph.trim()) {
                // Split paragraph into lines that fit
                const lines = doc.splitTextToSize(paragraph.trim(), pageWidth);
                
                lines.forEach((line, lIndex) => {
                    // Check if we need a new page
                    if (currentY > 280) { // Close to bottom of A4
                        doc.addPage();
                        currentY = 20;
                    }
                    
                    doc.text(line, 20, currentY);
                    currentY += lineHeight;
                });
                
                // Add extra space between paragraphs
                if (pIndex < paragraphs.length - 1) {
                    currentY += lineHeight * 0.5;
                }
            }
        });
        
        // Add footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.text(`Page ${i} of ${pageCount} - Generated with CrazyTyper`, 20, 290);
        }
        
        // Save the PDF
        const filename = `crazytyper-${new Date().getTime()}.pdf`;
        doc.save(filename);
        
        // Show success message
        showTemporaryMessage(pdfBtn, 'PDF Downloaded!');
        
    } catch (error) {
        console.error('Error generating PDF:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            jsPDFAvailable: {
                'window.jspdf': typeof window.jspdf,
                'window.jsPDF': typeof window.jsPDF,
                'global jsPDF': typeof jsPDF
            }
        });
        showTemporaryMessage(pdfBtn, 'PDF Error');
        alert('Error generating PDF: ' + error.message + '\nCheck console for details.');
    }
}

function showTemporaryMessage(element, message) {
    if (!element) {
        console.warn('showTemporaryMessage: Element is null, message was:', message);
        return;
    }
    
    const originalText = element.textContent;
    const wasDisabled = element.disabled;
    
    element.textContent = message;
    if ('disabled' in element) {
        element.disabled = true;
    }
    
    setTimeout(() => {
        element.textContent = originalText;
        if ('disabled' in element) {
            element.disabled = wasDisabled;
        }
    }, 2000);
}

function setLoading(mode, loading) {
    if (mode === 'generate') {
        generateBtn.disabled = loading;
        if (loading) {
            btnText.classList.add('hidden');
            btnLoading.classList.remove('hidden');
        } else {
            btnText.classList.remove('hidden');
            btnLoading.classList.add('hidden');
        }
    } else if (mode === 'transform') {
        transformBtn.disabled = loading;
        if (loading) {
            transformBtnText.classList.add('hidden');
            transformBtnLoading.classList.remove('hidden');
        } else {
            transformBtnText.classList.remove('hidden');
            transformBtnLoading.classList.add('hidden');
        }
    }
}

function showOutput() {
    outputSection.classList.remove('hidden');
}

function hideOutput() {
    outputSection.classList.add('hidden');
}

function showError(message) {
    errorMessage.textContent = message;
    errorSection.classList.remove('hidden');
}

function hideError() {
    errorSection.classList.add('hidden');
}

// Font selection handlers
function handleFontSelectChange(e) {
    const customGroup = document.getElementById('customFontGroup');
    if (e.target.value === 'custom') {
        customGroup.style.display = 'block';
    } else {
        customGroup.style.display = 'none';
    }
}

function handleFontSelectChangeTransform(e) {
    const customGroup = document.getElementById('customFontGroupTransform');
    if (e.target.value === 'custom') {
        customGroup.style.display = 'block';
    } else {
        customGroup.style.display = 'none';
    }
}

function handleLengthSelectChange(e) {
    const customGroup = document.getElementById('customWordCountGroup');
    if (e.target.value === 'custom') {
        customGroup.style.display = 'block';
    } else {
        customGroup.style.display = 'none';
    }
}

// Custom font upload handlers
function handleCustomFontUpload(e) {
    const file = e.target.files[0];
    if (file) {
        loadCustomFont(file, 'generate');
    }
}

function handleCustomFontUploadTransform(e) {
    const file = e.target.files[0];
    if (file) {
        loadCustomFont(file, 'transform');
    }
}

function loadCustomFont(file, mode) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const fontData = e.target.result;
        const fontName = 'custom-font-' + Date.now();
        
        // Create font face
        const fontFace = new FontFace(fontName, fontData);
        
        fontFace.load().then(function(loadedFont) {
            // Add font to document
            document.fonts.add(loadedFont);
            
            // Store font info including the data for PDF export
            customFonts[mode] = {
                name: fontName,
                family: fontName,
                data: fontData,
                fontFace: loadedFont
            };
            
            console.log('Custom font stored for mode:', mode, {
                name: fontName,
                dataSize: fontData.byteLength,
                mode: mode,
                customFonts
            });
            
            // Create CSS rule for the font
            const style = document.createElement('style');
            style.textContent = `
                .font-custom {
                    font-family: '${fontName}', monospace !important;
                }
            `;
            document.head.appendChild(style);
            
            // CRITICAL FIX: Automatically select "custom" in the font dropdown
            const fontSelectId = mode === 'generate' ? 'fontSelect' : 'fontSelectTransform';
            const fontSelect = document.getElementById(fontSelectId);
            fontSelect.value = 'custom';
            console.log('Auto-selected "custom" font for mode:', mode);
            
            // Find the label near the file input for feedback
            const fileInput = mode === 'generate' 
                ? document.getElementById('customFontUpload')
                : document.getElementById('customFontUploadTransform');
            const label = fileInput ? fileInput.closest('.input-group').querySelector('label') : null;
            
            if (label) {
                showTemporaryMessage(label, 'Font loaded successfully!');
            } else {
                console.log('Font loaded successfully:', fontName);
            }
        }).catch(function(error) {
            console.error('Error loading custom font:', error);
            showError('Failed to load custom font. Please try a different file.');
        });
    };
    
    reader.readAsArrayBuffer(file);
}

// Optimize text processing for large documents
function optimizeTextProcessing(text, level) {
    // For very large texts, reduce animation and processing intensity
    const textLength = text.length;
    
    if (textLength > 10000) {
        // Disable typing animation for very large texts
        return {
            animate: false,
            batchSize: 1000,
            processInChunks: true
        };
    } else if (textLength > 5000) {
        return {
            animate: true,
            batchSize: 500,
            processInChunks: true,
            animationSpeed: 1 // Faster animation
        };
    } else {
        return {
            animate: true,
            batchSize: 100,
            processInChunks: false,
            animationSpeed: 30 // Normal speed
        };
    }
}