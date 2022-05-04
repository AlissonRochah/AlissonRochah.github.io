$('.mainProjectsContentSlider').slick({
    centerMode: true,
    slidesToShow: 3,
    variableWidth: true,
    responsive: [
      {
        breakpoint: 768,
        settings: {
          arrows: false,
          centerMode: true,
          centerPadding: '40px',
          slidesToShow: 1
        }
      },
      {
        breakpoint: 480,
        settings: {
          arrows: false,
          centerMode: true,
          centerPadding: '40px',
          slidesToShow: 1
        }
      }
    ]
  });

const btnMobile = document.getElementById('btnMobile');
const closeMobile = document.getElementById('closeMobile');

function toggleMenu(event) {
    if (event.type === 'touchstart') event.preventDefault();
    const nav = document.getElementById('menuMobile');
    nav.classList.toggle('active');
}


btnMobile.addEventListener('click', toggleMenu);
btnMobile.addEventListener('touchstart', toggleMenu);

closeMobile.addEventListener('click', toggleMenu);
closeMobile.addEventListener('touchstart', toggleMenu);