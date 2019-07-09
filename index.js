const config = {
    type: Phaser.AUTO,
    width: 640,
    height: 640,
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config)
const bg_color = 0x202020

class GameBoard {
    // Must be square grid
    constructor(size) {
        this.num_x = size
        this.num_y = size
        this.cellWidth = game.config.width/this.num_x
        this.cellHeight = game.config.height/this.num_y
        this.grid = new Array(this.num_x*this.num_y).fill(false)
        this.alpha_grid = new Array(this.num_x*this.num_y).fill(0.)
        this.cell_images = []
        this.paused = false
        this.create_on_drag = false
        this.currently_dragging = false
    }

    get_im(x, y) {
        return this.cell_images[x*this.num_y + y]
    }

    // Supports toroidal grid
    get(x, y) {
        x = Phaser.Math.Wrap(x, 0, this.num_x)
        y = Phaser.Math.Wrap(y, 0, this.num_y)
        return this.grid[y*this.num_x + x]
    }

    get_alpha(x, y) {
        x = Phaser.Math.Wrap(x, 0, this.num_x)
        y = Phaser.Math.Wrap(y, 0, this.num_y)
        return this.alpha_grid[y*this.num_x + x]
    }

    set(x, y, val) {
        this.grid[y*this.num_x + x] = val
    }

    toggle(x, y) {
        if (this.create_on_drag) {
            this.set(x, y, true)
        } else {
            this.set(x, y, false)
        }
        if (!this.grid[y*this.num_x + x]) {
            this.alpha_grid[y*this.num_x + x] = 0.
        }
        this.draw_cell(x, y)
    }

    toggle_pause() {
        this.paused = !this.paused
    }

    clear() {
        this.grid = new Array(this.num_x*this.num_y).fill(false)
        this.alpha_grid = new Array(this.num_x*this.num_y).fill(0.)
        this.update()
    }

    draw_cell(x, y) {
        if (this.get(x, y)) {
            this.get_im(x, y).setTexture('cell_on')
            this.alpha_grid[y*this.num_x + x] = 1.0
            this.get_im(x, y).setAlpha(this.get_alpha(x, y))
        } else {
            if (this.get_alpha(x, y) > 0) {
                this.alpha_grid[y*this.num_x + x] -= 0.1
            }
            if (this.get_alpha(x, y) <= 0) {
                this.get_im(x, y).setTexture('cell_off')    
            } else {
                this.get_im(x, y).setTexture('cell_on')
                this.get_im(x, y).setAlpha(this.get_alpha(x, y))
            }
        }
    }

    update_cell(x, y) {
        let num_adj = 0
        num_adj += (this.get(x - 1, y - 1) ? 1 : 0)
        num_adj += (this.get(x - 1, y) ? 1 : 0)
        num_adj += (this.get(x - 1, y + 1) ? 1 : 0)
        num_adj += (this.get(x, y - 1) ? 1 : 0)
        num_adj += (this.get(x, y + 1) ? 1 : 0)
        num_adj += (this.get(x + 1, y - 1) ? 1 : 0)
        num_adj += (this.get(x + 1, y) ? 1 : 0)
        num_adj += (this.get(x + 1, y + 1) ? 1 : 0)
        if (this.get(x, y)) {
            return num_adj == 2 || num_adj == 3
        } else {
            return num_adj == 3
        }
    }

    update() {
        const new_grid = new Array(this.num_x*this.num_y).fill(false)
        for (let i=0; i < this.num_x; i++) {
            for (let j=0; j < this.num_y; j++) {
                new_grid[j*this.num_x + i] = this.update_cell(i, j)
            }
        }
        this.grid = new_grid

        for (let i=0; i < this.num_x; i++) {
            for (let j=0; j < this.num_y; j++) {
                this.draw_cell(i, j)
            }
        }
    }

    makeGrid(phaser) {
        let graphics = phaser.make.graphics()
        graphics.lineStyle(1, 0xF8F8F8)
        // Draw line in grid
        graphics.beginPath()
        for(let i=0; i < this.num_y; i++) {
            graphics.moveTo(0, i*this.cellHeight)
            graphics.lineTo(game.config.width, i*this.cellHeight)
        }
        for(let j=0; j < this.num_x; j++) {
            graphics.moveTo(j*this.cellWidth, 0)
            graphics.lineTo(j*this.cellWidth, game.config.height)
        }
        graphics.closePath()
        graphics.strokePath()

        graphics.generateTexture('grid', game.config.width, game.config.height)
        graphics.destroy()
    }

    makeCells(phaser) {
        //  Create a little 32x32 texture to use to show where the mouse is
        let graphics = phaser.make.graphics({ x: 0, y: 0, add: false, fillStyle: { color: 0xD0D0D0, alpha: 1 } });
        graphics.fillRect(0, 0, this.cellWidth - 1, this.cellHeight - 1);
        graphics.generateTexture('cell_on', this.cellWidth - 1, this.cellHeight - 1);
        graphics.fillStyle(bg_color, 1)
        graphics.fillRect(0, 0, this.cellWidth - 1, this.cellHeight - 1);
        graphics.generateTexture('cell_off', this.cellWidth - 1, this.cellHeight - 1);

        for(let i=0; i < this.num_x; i++) {
            for(let j=0; j < this.num_y; j++) {
                let x = i*this.cellWidth
                let y = j*this.cellHeight
                let im = phaser.add.image(x, y, 'cell_off').setOrigin(0, 0)
                im.setInteractive()
                .on('pointerdown', () => {
                    this.create_on_drag = !this.get(i, j)
                    this.currently_dragging = true
                    this.toggle(i, j)})
                .on('pointerover', () => {
                    if (this.currently_dragging) {
                        this.toggle(i, j)
                    }})
                .on('pointerup', () => {
                    if (this.currently_dragging) {
                        this.toggle(i, j)
                    }
                    console.log('pointerup')
                    this.currently_dragging = false})
                this.cell_images.push(im)
            }
        }
    }
}

let board
let generationText

function preload () {
}

function create () {
    this.cameras.main.setBackgroundColor(bg_color)
    board = new GameBoard(32)
    board.makeGrid(this)
    this.add.image(0, 0, 'grid').setOrigin(0, 0)
    board.makeCells(this)

    this.input.keyboard.on('keydown-SPACE', () => {board.toggle_pause(); console.log('toggle_pause!')})
    this.input.keyboard.on('keydown-C', () => board.clear())
    this.input.on('pointerupoutside', () => {board.currently_dragging = false; console.log('pointerupoutside')})

    board.set(4, 4, true)
    board.set(3, 4, true)
    board.set(5, 4, true)

    generationText = this.add.text(game.config.width, 0, '0', {fontsize: '32px', fill: '#FFFFFF'}).setOrigin(1, 0)
}

let current_time = 0
const update_speed = 100
let generation_num = 0

function update (time, delta) {
    current_time += delta
    if (!board.paused && current_time > update_speed) {
        board.update()
        current_time = 0

        generation_num += 1
        generationText.setText(generation_num)
    }
}