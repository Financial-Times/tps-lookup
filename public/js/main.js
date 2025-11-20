document.addEventListener('DOMContentLoaded', () => {
  const numberInput = document.querySelector('.search-input');
  const searchForm = document.querySelector('.search-form');
  const searchButton = document.querySelector('.search-button');
  const resultSection = document.querySelector('.search-result-text');
  const logoutLink = document.querySelector('.logout-link');
  const logoutForm = document.querySelector('.logout-form');
  const crossImg = document.getElementById('img-cross');
  const tickImg = document.getElementById('img-tick');

  const clearMessages = () => {
    if (tickImg) tickImg.classList.add('img-hidden');
    if (crossImg) crossImg.classList.add('img-hidden');
    if (resultSection) resultSection.innerHTML = '';
  };

  // Logout functionality
  if (logoutLink && logoutForm) {
    logoutLink.addEventListener('click', (e) => {
      e.preventDefault();
      logoutForm.submit();
    });
  }

  // form submission
  if (searchForm) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();

      clearMessages();

      const options = {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify([numberInput?.value || ''])
      };

      fetch('/search', options)
        .then((res) => {
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          return res.json();
        })
        .then((resJson) => {
          let resText;
          if (resJson.results[0].canCall) {
            resText = 'Good news! This number is not on the TPS/CTPS list.';
            if (tickImg) tickImg.classList.remove('img-hidden');
          } else {
            resText =
              'This number IS ON the TPS/CTPS list. Please seek guidance before calling.';
            if (crossImg) crossImg.classList.remove('img-hidden');
          }
          if (resultSection) resultSection.innerHTML = resText;
        })
        .catch((err) => {
          console.error('Error during fetch:', err);
          if (resultSection)
            resultSection.innerHTML =
              'An error occurred. Please try again later.';
        });
    });
  }

  if (searchButton) {
    searchButton.addEventListener('click', () => {
      clearMessages();
    });
  }

  if (numberInput) {
    numberInput.addEventListener('keypress', (e) => {
      const key = e.which || e.keyCode;
      if (key === 13) {
        clearMessages();
      }
    });
  }
});
