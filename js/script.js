window.addEventListener('load', function(){

window.AudioContext = window.AudioContext||window.webkitAudioContext;
var context = new AudioContext();

  var file = document.querySelector('.upload__input'),
      upload = document.querySelector('.upload__button'),
      fileName = document.querySelector('.upload__title'),
      playButton = document.querySelector('.controls__button--play'),
      stopButton = document.querySelector('.controls__button--stop'),
      url, buffer, source, destination, analyser, context,
      rafID, analyserContext, canvasWidth, canvasHeight,
      genres = {
        rock: [-5, 8, 3, -4, -5, -6, -5, -4, -3, 2],
        pop: [-1, 2, 4, 5, 5, 4, 7, 1, 1, 5],
        jazz: [3, 5, 5, 4, 2, -2, -1, -8, 4, 1],
        classic: [0, 0, 0, 0, 0, 0, 0, -1, -3, -8],
        normal: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
      }; // Значения для фильтров-жанров взяты наобум. Берегите уши!

  // фильтры (эквалайзер)
  function createFilter(frequency) {
    var filter = context.createBiquadFilter();
    filter.type = 'peaking';
    filter.frequency.value = frequency;
    filter.Q.value = 1;
    filter.gain.value = 0;
    return filter;
  }

  function combineFilters() {
    var frequencies = [60, 170, 310, 600, 1000, 3000, 6000, 12000, 14000, 16000];
    filters = frequencies.map(createFilter);
    filters.reduce(function (prev, curr) { // соединяем фильтры
      prev.connect(curr);
      return curr;
    });
    return filters;
  }

  // мощность сигнала
  function preSet(set) {
    set.forEach(function(evt, i) {
    filters[i].gain.value = set[i];
    })
  }

  [].forEach.call(document.querySelectorAll('.equalizer__item'), function (set) {
    set.addEventListener('click', function() {
    preSet(genres[this.getAttribute("data-mode")]);
    }, false);
  });

  function updateAnalysers() { // обновление анализатора
    var canvas = document.getElementById("player__analyser");

    if (!analyserContext) { // создаем холст
      canvasWidth = canvas.width;
      canvasHeight = canvas.height;
      analyserContext = canvas.getContext('2d');
    }

    // визуализация
    var barWidth = 1.2,
        barLength = 150,
        analyserArray = new Uint8Array(analyser.frequencyBinCount),
        gradient = analyserContext.createLinearGradient(canvasWidth, 0, canvasWidth, canvasHeight),
        barHeight, offset;

    analyser.getByteFrequencyData(analyserArray);
    analyserContext.clearRect(0, 0, canvasWidth, canvasHeight);

    gradient.addColorStop(0.20,'#d4ece8');
    gradient.addColorStop(0.40,'#8affb4');
    gradient.addColorStop(0.65,'#52ceba');
    gradient.addColorStop(0.80,'#438a70');
    analyserContext.fillStyle = gradient;

    for (var i = 0; i < barLength; ++i) {
      barHeight = 0;
      offset = Math.floor(i * 0.3);
      barHeight += analyserArray[offset];
      analyserContext.fillRect(i * 2, canvasHeight, barWidth - 2, -barHeight / 2);
    }
    rafID = window.requestAnimationFrame(updateAnalysers);
  }

  // анализатор
  function analyserSourse() {
    analyser = context.createAnalyser();
    filters[filters.length - 1].connect(analyser);
    analyser.fftSize = 256;
    updateAnalysers();
  }

  function loadSoundFile(url) { // подгрузка файла в буфер
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';

    xhr.onload = function(event) {
      context.decodeAudioData(this.response, // декодируем бинарный ответ

      function(decodedArrayBuffer) {
        buffer = decodedArrayBuffer; // получаем декодированный буфер
      }, function(event) { console.log('Ошибка', event); });
    };
    xhr.send();
  }

  // метаданные
  function getMetaData(url, file) {
    ID3.loadTags(url, function() {
      var tags = ID3.getAllTags(url),
          fileData = document.querySelector('.upload__data');

      if (tags.artist || tags.title) {
        if (tags.artist && tags.title) fileData.innerHTML = (tags.artist + " - " + tags.title);
        else if (tags.artist) fileData.innerHTML = (tags.artist);
        else fileData.innerHTML = (tags.title);
      }
      else {
        fileData.innerHTML = ("Нет информации о треке");
      }
    },
    { dataReader: FileAPIReader(file) });
  }

  function getDataSound(files) { // получаем данные
    var f = files[0];
    loadSoundFile(URL.createObjectURL(f));
    getMetaData(URL.createObjectURL(f), f);
  }

// Конец функций

  // Загрузка файла, drag'n'drop
  file.addEventListener('change', function(event){
    event.stopPropagation();
    fileName.innerHTML = this.files[0].name;
    getDataSound(this.files);
  }, false);

  upload.addEventListener('dragover', function(event){
    event.preventDefault();
    event.stopPropagation();
  }, false);

  upload.addEventListener('drop', function(event){
    event.preventDefault();
    event.stopPropagation();
    fileName.innerHTML = event.dataTransfer.files[0].name;
    getDataSound(event.dataTransfer.files);
    return false;
  }, false);

  // Воспроизведение и остановка
  playButton.addEventListener('click', function(event){
    // если уже есть файл, останавливаем воспроизведение
    if (source) {
      source.stop(0);
      source = undefined;
    }
    // если нет - создаем источник
    source = context.createBufferSource();
    source.buffer = buffer;  // подключение буфера
    filters = combineFilters();
    source.connect(filters[0]); // подключение фильтра к источнику
    filters[filters.length - 1].connect(context.destination);
    source.start(0);  // воспроизведение
    analyserSourse(); // запуск анализатора

    source.addEventListener('ended', function(){
      window.cancelAnimationFrame( rafID );
      rafID = null;
      analyserContext.clearRect(0, 0, canvasWidth, canvasHeight);
    }, false);
  }), false;

  stopButton.addEventListener('click', function(event) {
      source.stop(0);
      source = undefined;
  }, false);

}, false);
