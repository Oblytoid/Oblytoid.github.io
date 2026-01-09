const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d');

let width, height;
let stars = [];
let chaseSequence;

// Cores
const starColors = ['#ffffff', '#ff0044', '#00ffaa', '#ffff00'];
const ghostColors = ['#ff0000', '#ffb8ff', '#00ffff', '#ffb852']; // Blinky, Pinky, Inky, Clyde

function init() {
    resize();
    createStars();
    chaseSequence = new ChaseSequence();
    animate();
}

function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
}

class Star {
    constructor() {
        this.reset(true);
    }

    reset(initial = false) {
        this.x = Math.random() * width;
        this.y = initial ? Math.random() * height : -10;
        this.size = Math.random() * 2 + 1;
        this.speed = Math.random() * 3 + 1; 
        this.color = starColors[Math.floor(Math.random() * starColors.length)];
        this.opacity = Math.random();
    }

    update() {
        this.y += this.speed;
        if (Math.random() > 0.95) this.opacity = Math.random();
        if (this.y > height) this.reset();
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.opacity;
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.globalAlpha = 1;
    }
}

class Ghost {
    constructor(color, offset) {
        this.baseColor = color;
        this.offset = offset; // Distância relativa ao líder
        this.x = 0;
        this.y = 0;
        this.size = 22;
        this.isScared = false;
        
        // Animação dos pés/saia
        this.frame = 0;
    }

    update(leaderX, y, direction, mode) {
        this.isScared = (mode === 'scared');
        this.y = y;
        
        // Se isScared: Pacman persegue Fantasmas -> Fantasmas fogem na frente do Pacman
        // Se normal: Fantasmas perseguem Pacman -> Pacman foge na frente dos fantasmas
        
        // Simplificação: O "ChaseSequence" define a posição X baseada em um "headX" global da sequência.
        // Aqui apenas desenhamos relativo a esse X com um offset.
    }

    draw(ctx, x, y, direction) {
        ctx.save();
        ctx.translate(x, y);
        
        // Corpo
        ctx.fillStyle = this.isScared ? '#0000ff' : this.baseColor;
        ctx.beginPath();
        ctx.arc(0, -2, this.size, Math.PI, 0); // Cabeça redonda
        ctx.lineTo(this.size, this.size); 
        
        // Pés (onda simples)
        this.frame += 0.1;
        const wave = Math.sin(this.frame) * 5;
        
        ctx.lineTo(this.size / 2, this.size - wave);
        ctx.lineTo(0, this.size + wave);
        ctx.lineTo(-this.size / 2, this.size - wave);
        ctx.lineTo(-this.size, this.size);
        ctx.lineTo(-this.size, -2);
        ctx.fill();

        // Olhos
        if (this.isScared) {
            // Rosto assustado (boca ondulada e olhos brancos pequenos)
            ctx.fillStyle = '#ffb8ae'; // cor da boca/rosto
            ctx.fillRect(-8, 6, 4, 4);
            ctx.fillRect(0, 6, 4, 4);
            ctx.fillRect(8, 6, 4, 4);
        } else {
            // Olhos normais
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(-8, -4, 6, 0, Math.PI * 2);
            ctx.arc(8, -4, 6, 0, Math.PI * 2);
            ctx.fill();
            
            // Pupilas (olhando na direção do movimento)
            ctx.fillStyle = '#0000aa';
            const pupilOffset = direction * 3;
            ctx.beginPath();
            ctx.arc(-8 + pupilOffset, -4, 3, 0, Math.PI * 2);
            ctx.arc(8 + pupilOffset, -4, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}

class ChaseSequence {
    constructor() {
        this.active = false;
        this.mode = 'normal'; // 'normal' ou 'scared'
        this.pacman = { size: 25, mouthOpen: 0.2, mouthOpening: true };
        this.ghosts = ghostColors.map((color, i) => new Ghost(color, (i + 1) * 60));
        this.reset();
    }

    reset() {
        this.active = false;
        this.x = -500;
        this.y = -100;
        this.mouthSpeed = 0.01;
    }

    spawn() {
        this.active = true;
        this.y = Math.random() * (height - 150) + 75;
        this.speed = Math.random() * 2 + 3;
        
        // 50% de chance de ser chasing ou scared
        this.mode = Math.random() > 0.5 ? 'normal' : 'scared';
        
        // Direção
        // Se normal: Pacman na frente (Direção muda X relativo)
        // Se scared: Fantasmas na frente
        if (Math.random() > 0.5) {
            this.direction = 1; // Direita
            this.startX = -300; // Começa antes da tela
            this.endX = width + 300;
        } else {
            this.direction = -1; // Esquerda
            this.startX = width + 300;
            this.endX = -300;
        }
        
        this.x = this.startX;
    }

    update() {
        if (!this.active) {
            if (Math.random() < 0.003) this.spawn(); // Chance de spawn
            return;
        }

        this.x += this.speed * this.direction;

        // Animação boca Pacman
        if (this.pacman.mouthOpening) {
            this.pacman.mouthOpen += this.mouthSpeed;
            if (this.pacman.mouthOpen >= 0.25) this.pacman.mouthOpening = false;
        } else {
            this.pacman.mouthOpen -= this.mouthSpeed;
            if (this.pacman.mouthOpen <= 0.01) this.pacman.mouthOpening = true;
        }

        // Reset se sair da tela
        if ((this.direction === 1 && this.x > this.endX) || 
            (this.direction === -1 && this.x < this.endX)) {
            this.reset();
        }
    }

    draw() {
        if (!this.active) return;
        
        // Definir ordem de desenho e posições
        let pacmanX, ghostsXBase;
        
        if (this.mode === 'normal') {
            // Pacman lidera
            pacmanX = this.x;
            // Fantasmas seguem atrás
            // Se direita (Dir=1): Fantasmas em X - offset
            // Se esquerda (Dir=-1): Fantasmas em X + offset
        } else {
            // Power Mode: Pacman persegue (está atrás)
            // Pacman fica atrás dos fantasmas
            // Fantasmas lideram (na posição X)
            // Pacman fica em X - (maxOffset + algo) * direction
        }

        // Simplicar lógica de posicionamento: desenhar grupo centrado no this.x
        // Se Normal: X(Pac) ... X-50(Red) ... X-100(Pink) -- andando para direita
        // Se Scared: X(Blue) ... X-50(Blue) ... ... X-250(Pac) -- andando para direita
        
        if (this.mode === 'normal') {
            this.drawPacman(this.x);
            this.ghosts.forEach((ghost, i) => {
                const lag = (i + 1) * 60;
                ghost.isScared = false;
                ghost.draw(ctx, this.x - (lag * this.direction), this.y, this.direction);
            });
        } else {
            // Modo Scared
            // Fantasmas na frente
            this.ghosts.forEach((ghost, i) => {
                const lead = (4 - i) * 60; // Inverter ordem visual ou manter grupo
                ghost.isScared = true;
                // Fantasmas liderando o grupo
                ghost.draw(ctx, this.x - (i * 50 * this.direction), this.y, this.direction);
            });
            // Pacman bem atrás
            this.drawPacman(this.x - (300 * this.direction));
        }
    }
    
    drawPacman(posX) {
        ctx.save();
        ctx.translate(posX, this.y);
        if (this.direction === -1) ctx.scale(-1, 1);
        
        ctx.fillStyle = '#FFFF00';
        ctx.beginPath();
        const halfMouth = this.pacman.mouthOpen * Math.PI;
        ctx.arc(0, 0, this.pacman.size, halfMouth, (2 * Math.PI) - halfMouth);
        ctx.lineTo(0, 0);
        ctx.fill();
        ctx.restore();
    }
}

function createStars() {
    stars = [];
    const starCount = Math.floor((width * height) / 4000);
    for (let i = 0; i < starCount; i++) {
        stars.push(new Star());
    }
}

function animate() {
    ctx.clearRect(0, 0, width, height);

    stars.forEach(star => {
        star.update();
        star.draw();
    });

    if (chaseSequence) {
        chaseSequence.update();
        chaseSequence.draw();
    }

    requestAnimationFrame(animate);
}

window.addEventListener('resize', () => {
    resize();
    createStars();
});

init();