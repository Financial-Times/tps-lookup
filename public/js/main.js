function searchHandler() {
  const numberInput = document.querySelector('.search-input');
  const resultSection = document.querySelector('.search-result-text');
  const crossImg = document.getElementById('img-cross');
  const tickImg = document.getElementById('img-tick');
  return () => {
    const options = {
      method: 'POST',
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
          resText = 'This number is not on the TPS list;
          tickImg.classList.remove('img-hidden');
          crossImg.classList.add('img-hidden');
        } else {
          resText = 'This number IS ON the TPS list';
          crossImg.classList.remove('img-hidden');
          tickImg.classList.add('img-hidden');
        }
        resultSection.innerHTML = resText;
      })
      .catch(err => {
        console.log(err);
      });
  }
}

document.querySelector('.search-button').addEventListener('click', searchHandler());
