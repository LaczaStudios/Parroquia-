// ===================================
// 1. VARIABLES GLOBALES
// ===================================
// Asumimos que 'storage' y 'db' fueron inicializadas en la etiqueta <script> en index.html
const dropZone = document.getElementById('drop-zone');
const galleryDisplay = document.getElementById('gallery-display');

// ===================================
// 2. FUNCIONALIDAD DRAG AND DROP
// ===================================

// Previene el comportamiento por defecto del navegador (abrir la imagen)
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
    document.body.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

// Añade la clase 'dragover' para estilos visuales
['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.add('dragover'), false);
});

// Remueve la clase 'dragover'
['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.remove('dragover'), false);
});

// Maneja la acción de soltar el archivo
dropZone.addEventListener('drop', handleDrop, false);

function handleDrop(e) {
    let dt = e.dataTransfer;
    let files = dt.files;

    handleFiles(files);
}

// ===================================
// 3. SUBIDA DE ARCHIVOS A FIREBASE
// ===================================

function handleFiles(files) {
    const file = files[0]; 

    if (file && file.type.startsWith('image/')) {
        dropZone.textContent = 'Subiendo... Por favor, espera.';
        uploadFile(file);
    } else {
        alert('Por favor, suelta solo archivos de imagen (JPG, PNG, etc.).');
    }
}

function uploadFile(file) {
    // Crea una referencia única para la imagen en Storage
    const storageRef = storage.ref(`gallery/${Date.now()}_${file.name}`);

    // Sube el archivo
    const uploadTask = storageRef.put(file);

    uploadTask.on('state_changed', 
        (snapshot) => {
            // Muestra el progreso
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            dropZone.textContent = `Subiendo: ${Math.round(progress)}%`;
        }, 
        (error) => {
            console.error("Error al subir el archivo:", error);
            dropZone.textContent = 'Error al subir. Revisa tus reglas de Firebase.';
        }, 
        () => {
            // Subida exitosa: obtiene el enlace público
            uploadTask.snapshot.ref.getDownloadURL().then((downloadURL) => {
                
                // Guarda el enlace y metadata en Firestore (la "base de datos")
                saveFileUrlToDB(downloadURL, file.name);

                dropZone.textContent = '¡Subida exitosa! Arrastra otra foto.';
            });
        }
    );
}

function saveFileUrlToDB(url, name) {
    // Añade un nuevo registro a la colección "photos" en Firestore
    db.collection("photos").add({
        url: url,
        name: name,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    })
    .then(() => {
        // Al guardar, actualiza la galería
        loadGalleryImages(); 
    })
    .catch((error) => {
        console.error("Error al añadir el documento a Firestore: ", error);
    });
}

// ===================================
// 4. CARGAR Y MOSTRAR IMÁGENES DE LA DB
// ===================================

function loadGalleryImages() {
    // Limpia el contenedor de la galería antes de cargar las nuevas
    galleryDisplay.innerHTML = ''; 

    // Obtiene las fotos de Firestore, ordenadas por más recientes
    db.collection("photos").orderBy("timestamp", "desc").get()
        .then((querySnapshot) => {
            querySnapshot.forEach((doc) => {
                const photo = doc.data();
                
                // Crea el elemento <img>
                const imgElement = document.createElement('img');
                imgElement.src = photo.url;
                imgElement.alt = photo.name;
                imgElement.classList.add('gallery-image');
                
                galleryDisplay.appendChild(imgElement);
            });
        })
        .catch((error) => {
            console.error("Error al obtener las imágenes de Firestore: ", error);
        });
}

// Carga las imágenes al inicio
window.onload = loadGalleryImages;