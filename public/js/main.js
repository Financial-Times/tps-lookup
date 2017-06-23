const numberInput = document.querySelector('.search-input');
const searchButton = document.querySelector('.search-button')
const resultSection = document.querySelector('.search-result-text');
const crossImg = document.getElementById('img-cross');
const tickImg = document.getElementById('img-tick');

function searchHandler() {
  const options = {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify([numberInput.value])
  }

  fetch('/search', options)
    .then(res => {
      return res.json();
    })
    .then(resJson => {
      let resText;
      if (resJson.results[0].canCall) {
        resText = 'Good news! This number is not on the TPS/CTPS list';
        tickImg.classList.remove('img-hidden');
        crossImg.classList.add('img-hidden');
      } else {
        resText = 'This number IS ON the TPS/CTPS list. Please seek guidance before calling.';
        crossImg.classList.remove('img-hidden');
        tickImg.classList.add('img-hidden');
      }
      resultSection.innerHTML = resText;
    })
    .catch(err => {
      console.log(err);
    });
}

searchButton.addEventListener('click', searchHandler);
numberInput.addEventListener('keypress', (e) => {
  const key = e.which || e.keyCode;
  if (key === 13) {
    searchHandler();
  }
});
