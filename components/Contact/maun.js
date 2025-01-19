function toggleMenu() {
    const menu = document.querySelector('.magic-menu');
    const ul = menu.querySelector('.menu');
    ul.classList.toggle('opacity-100');
    ul.classList.toggle('invisible');
}