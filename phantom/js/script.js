let faq = document.getElementsByClassName("faq-page");
let i;

for (let i = 0; i < faq.length; i++) {
    faq[i].addEventListener("click", function (){
        this.classList.toggle("active");

        let body = this.nextElementSibling;
        if (body.style.display === "block") {
            body.style.display = "none";
        } else {
            body.style.display = "block"
        }
    });
    
}

const elementos = document.querySelectorAll('[data-anima]');
const animationClass = 'animation';

function animaScroll(){
    const topPage = window.pageYOffset + ((window.innerHeight*6)/7);

    elementos.forEach(function(elemento) {
        if(topPage > elemento.offsetTop){
            elemento.classList.add(animationClass);
        } else {
            elemento.classList.remove(animationClass);
        }
    });
}

if (elementos.length) {
    window.addEventListener("scroll", function(){
        animaScroll();
    })
}

const btnMobile = document.getElementById('btn-mobile');
const closeMobile = document.getElementById('close');

function toggleMenu(event) {
    if (event.type === 'touchstart') event.preventDefault();
    const nav = document.getElementById('nav');
    nav.classList.toggle('active');
}


btnMobile.addEventListener('click', toggleMenu);
btnMobile.addEventListener('touchstart', toggleMenu);

closeMobile.addEventListener('click', toggleMenu);
closeMobile.addEventListener('touchstart', toggleMenu);