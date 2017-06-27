const numberInput = document.querySelector('.search-input');
const searchForm = document.querySelector('.search-form')
const searchButton = document.querySelector('.search-button')
const resultSection = document.querySelector('.search-result-text');
const logoutLink = document.querySelector('.logout-link');
const logoutForm = document.querySelector('.logout-form');
const crossImg = document.getElementById('img-cross');
const tickImg = document.getElementById('img-tick');

function logoutHandler(e) {
  e.preventDefault();
  logoutForm.submit();
}

function clearMessages() {
  tickImg.classList.add('img-hidden');
  crossImg.classList.add('img-hidden');
  resultSection.innerHTML = '';
}

function searchHandler(e) {
  e.preventDefault();

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
        resText = 'Good news! This number is not on the TPS/CTPS list.';
        tickImg.classList.remove('img-hidden');
      } else {
        resText = 'This number IS ON the TPS/CTPS list. Please seek guidance before calling.';
        crossImg.classList.remove('img-hidden');
      }
      resultSection.innerHTML = resText;
    })
    .catch(err => {
      console.log(err);
    });
}

searchForm.addEventListener('submit', searchHandler);
searchButton.addEventListener('click', clearMessages);
logoutLink.addEventListener('click', logoutHandler);
numberInput.addEventListener('keypress', (e) => {
  const key = e.which || e.keyCode;
  if (key === 13) {
    clearMessages();
  }
});
