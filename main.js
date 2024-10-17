// main.js

// Variables to store data
let panZoom; // Declare panZoom at a higher scope
let countriesData = []; // From countries_and_exports.json
let categoriesData = {}; // From categorized_exports.json
let categoryColors = {}; // Map normalized export name to color
let exportList = []; // List of all possible exports [{displayName, normalizedName}]
let exportsMap = {}; // Map normalizedName to displayName
let selectedCountry = null; // Currently selected country

// Function to load data files
function loadData() {
    // Load countries_and_exports.json
    fetch('countries_and_exports.json')
        .then(response => response.json())
        .then(data => {
            // Normalize the 'Main Exports' field
            data.forEach(country => {
                if (country['Main Exports'] && typeof country['Main Exports'] === 'string') {
                    country.normalizedExport = country['Main Exports'].trim().toLowerCase();
                } else {
                    country.normalizedExport = null; // Set null for countries with no export data
                }
            });
            countriesData = data;
            // Continue loading categories
            fetch('categorized_exports.json')
                .then(response => response.json())
                .then(data => {
                    categoriesData = data;
                    processCategories();
                    loadSVGMap(); // Start loading the SVG map
                });
        });
}

// Process categories data to build categoryColors and exportList
function processCategories() {
    categoryColors = {};
    exportList = [];
    exportsMap = {};
    for (let category in categoriesData) {
        let details = categoriesData[category];
        let color = details.color;
        let products = details.products;
        for (let product of products) {
            let productName = product.trim();
            let normalizedProductName = productName.toLowerCase();
            categoryColors[normalizedProductName] = color;
            if (!exportsMap[normalizedProductName]) {
                exportsMap[normalizedProductName] = productName;
                exportList.push({ displayName: productName, normalizedName: normalizedProductName });
            }
        }
    }
}

// Function to load the SVG map
function loadSVGMap() {
    fetch('map.svg')
        .then(response => response.text())
        .then(svgText => {
            // Insert the SVG into the DOM
            document.getElementById('map-container').innerHTML = svgText;
            initializeMap();
        });
}

// Initialize the map after SVG is loaded
function initializeMap() {
    // Set up zooming and panning
    panZoom = svgPanZoom('svg', {
        zoomEnabled: true,
        controlIconsEnabled: false, // Disable built-in controls
        fit: true,
        center: true
    });

    // Add the striped gray pattern to the SVG defs
    addStripedGrayPattern();

    // Add Tailwind classes to the SVG
    let svg = document.querySelector('svg');
    svg.classList.add('w-full', 'h-full');

    // Ensure the SVG fills the container
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    // Add event listeners to country paths
    let countries = svg.querySelectorAll('[id]');
    countries.forEach(country => {
        let countryId = country.getAttribute('id');
        let countryData = countriesData.find(c => c.ISO_A3 === countryId);

        // Apply gray stripes if no export data
        if (!countryData || countryData.normalizedExport === null) {
            country.setAttribute('style', 'fill: url(#stripedGray)');
            country.style.cursor = 'not-allowed'; // Change cursor to indicate no selection
        } else {
            country.style.cursor = 'pointer'; // Change cursor to pointer for selectable countries
            country.addEventListener('click', onCountryClick); // Add click event listener only to selectable countries
        }
    });

    // Initialize the export selector dropdown
    initExportSelector();

    document.getElementById('reset-map').addEventListener('click', function() {
        panZoom.reset();
    });

}

// Function to add the striped gray pattern to the SVG defs
function addStripedGrayPattern() {
    let svg = document.querySelector('svg');
    let defs = svg.querySelector('defs');
    if (!defs) {
        defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        svg.insertBefore(defs, svg.firstChild);
    }

    let pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
    pattern.setAttribute('id', 'stripedGray');
    pattern.setAttribute('patternUnits', 'userSpaceOnUse');
    pattern.setAttribute('width', '4');
    pattern.setAttribute('height', '4');

    let rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('width', '4');
    rect.setAttribute('height', '4');
    rect.setAttribute('fill', '#808080');

    let line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', '0');
    line.setAttribute('y1', '0');
    line.setAttribute('x2', '4');
    line.setAttribute('y2', '4');
    line.setAttribute('stroke', 'white');
    line.setAttribute('stroke-width', '1');

    pattern.appendChild(rect);
    pattern.appendChild(line);
    defs.appendChild(pattern);
}

// Handler for country click
function onCountryClick(event) {
    event.stopPropagation(); // Prevent event from bubbling up
    selectedCountry = event.currentTarget;
    let countryId = selectedCountry.getAttribute('id');

    // Enable the submit button
    document.getElementById('submit-export').disabled = false;

    // Get country name using the correct property name
    let countryData = countriesData.find(c => c.ISO_A3 === countryId);
    let countryName = countryData ? countryData['Final Display Name'] : 'Unknown Country';

    // Display the selected country name in the status message
    let statusMessage = document.getElementById('status-message');
    statusMessage.textContent = 'Selected Country: ' + countryName;
}

// Initialize the export selector dropdown
function initExportSelector() {
    let select = document.getElementById('export-select');
    // Populate the select options
    exportList.sort((a, b) => a.displayName.localeCompare(b.displayName)); // Sort the exports
    exportList.forEach(exportItem => {
        let option = document.createElement('option');
        option.value = exportItem.normalizedName;
        option.textContent = exportItem.displayName;
        select.appendChild(option);
    });

    // Enable the select; disable the submit button initially
    select.disabled = false;
    document.getElementById('submit-export').disabled = true;

    // Set initial status message
    let statusMessage = document.getElementById('status-message');
    statusMessage.textContent = 'Select a country by clicking on the map.';

    // Add event listener for submit button
    document.getElementById('submit-export').addEventListener('click', onExportSubmit);
}

// Handler for export submit
function onExportSubmit() {
    if (!selectedCountry) return;
    let countryId = selectedCountry.getAttribute('id');
    let selectedExport = document.getElementById('export-select').value;

    // Get the country's main export from countriesData
    let countryData = countriesData.find(c => c.ISO_A3 === countryId);
    if (!countryData || !countryData.normalizedExport) {
        // No data for this country
        // Apply default gray stripes pattern
        selectedCountry.setAttribute('style', 'fill: url(#stripedGray)');
        // Display message
        let statusMessage = document.getElementById('status-message');
        statusMessage.textContent = 'No data for this country.';
    } else {
        let mainExport = countryData.normalizedExport;
        if (selectedExport === mainExport) {
            // Correct
            // Get the color for the export
            let color = categoryColors[selectedExport] || '#808080'; // Default gray
            selectedCountry.setAttribute('style', 'fill: ' + color);
            // Display message
            let statusMessage = document.getElementById('status-message');
            statusMessage.textContent = 'Correct!';
        } else {
            // Incorrect
            let statusMessage = document.getElementById('status-message');
            statusMessage.textContent = 'Incorrect, try again.';
        }
    }

    // Reset selectedCountry and disable the submit button
    selectedCountry = null;
    document.getElementById('submit-export').disabled = true;
}

// Start the data loading process
loadData();
