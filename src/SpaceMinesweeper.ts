/* Lecture 6
 * CSCI 4611, Fall 2022, University of Minnesota
 * Instructor: Evan Suma Rosenberg <suma@umn.edu>
 * License: Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International
 */ 

import * as gfx from 'gophergfx'

export class SpaceMinesweeper extends gfx.GfxApp
{
    // The graphics primitives that define objects in the scene 
    private ship: gfx.Rectangle;
    private star: gfx.Rectangle;
    private mine: gfx.Rectangle;
    private explosion: gfx.Circle;

    // These transforms are "groups" that are used to hold instances
    // of the same base object when they need to be placed in the scene
    // multiple times. They contain an array called .children that
    // you can iterate through to access all these objects.
    private stars: gfx.Transform2;
    private mines: gfx.Transform2;
    private explosions: gfx.Transform2;

    // Member variable to store the current position of the mouse in
    // normalized device coordinates.
    private mousePosition: gfx.Vector2;

    private shipTarget: gfx.Vector2;

    // Member variable to record the last time a mine was spawned
    private timeSinceLastMineSpawn = 0;

    constructor()
    {
        // The first line of any child class constructor must call
        // the base class's constructor using the super() method. 
        super();

        // Initialize all the member variables
        this.ship = new gfx.Rectangle();
        this.star = new gfx.Rectangle();
        this.mine = new gfx.Rectangle();
        this.explosion = new gfx.Circle(0.1, 30);
        this.stars = new gfx.Transform2();
        this.mines = new gfx.Transform2();
        this.explosions = new gfx.Transform2();
        this.mousePosition = new gfx.Vector2();
        this.timeSinceLastMineSpawn = 0;
        this.shipTarget = new gfx.Vector2();

        // This parameter zooms in on the scene to fit within the window.
        // Other options include FIT or STRETCH.
        this.renderer.viewport = gfx.Viewport.CROP;
    }

    createScene(): void 
    {
        // Load the star texture to make the object a sprite
        this.star.material.texture = new gfx.Texture('./star.png');

        // Create a field of 200 star instances placed randomly throughout
        // the scene.  Note that the Math.random() function is also used to 
        // make them vary in size.
        const numStars = 200;
        for(let i=0; i < numStars; i++)
        {
            const starInstance = new gfx.ShapeInstance(this.star);
            const starSize = Math.random() * 0.01;
            starInstance.scale.set(starSize, starSize);
            starInstance.position.set(Math.random()*2-1, Math.random()*2-1);
            this.stars.add(starInstance);
        }

        // Load the mine texture to make the object a sprite, then scale it 
        // to an appropriate size.
        this.mine.material.texture =  new gfx.Texture('./mine.png');
        this.mine.scale.set(0.12, 0.12);
    
        // Load the ship texture to make the object a sprite, then scale it 
        // to an appropriate size.
        this.ship.material.texture = new gfx.Texture('./ship.png');
        this.ship.scale.set(0.08, 0.08);

        this.explosion.material.color.set(1, 0, 0, 0.5);

        // Add all the objects to the scene. Note that the order is important!
        // Objects that are added later will be rendered on top of objects
        // that are added first. This is most important for the stars; because
        // they are in the distant background, they should be added first.
        this.scene.add(this.stars);
        this.scene.add(this.mines);
        this.scene.add(this.explosions);
        this.scene.add(this.ship);
    }

    update(deltaTime: number): void 
    {
        // These parameters define the motions of objects in the scene,
        // which you will use to complete the code for this assignment.
        // You can feel free to modify them if you want your game
        // to have a different feel from the instructor's implementation.
        // Note that all speed variables are scaled by deltaTime.
        // This is important to make sure that the game plays similarly
        // on different devices regardless of the framerate.
        const mineSpawnInterval = .5;
        const mineSpeed = 0.1 * deltaTime;
        const shipSpeed = 0.75 * deltaTime;
        const explosionSpeed = 2 * deltaTime;

        if(this.ship.position.distanceTo(this.shipTarget) > 0.01)
        {
            const shipMovement = gfx.Vector2.subtract(this.shipTarget, this.ship.position);
            shipMovement.normalize();
            shipMovement.multiplyScalar(shipSpeed);

            this.ship.position.add(shipMovement);
        }
        else
        {
            // Point the ship wherever the mouse cursor is located.
            // Note that this.mousePosition has already been converted to
            // normalized device coordinates.
            this.ship.lookAt(this.mousePosition);
        }

        // Mine movement
        this.mines.children.forEach((mineElem: gfx.Transform2)=>{

            // This code makes the mines "home" in on the ship position
            const mineToShip = gfx.Vector2.subtract(this.ship.position, mineElem.position);
            mineToShip.normalize();
            mineToShip.multiplyScalar(mineSpeed);
            mineElem.position.add(mineToShip);

        });

        // Explosion animations
        this.explosions.children.forEach((explosionElem: gfx.Transform2)=>{
            explosionElem.scale.x += explosionSpeed;
            explosionElem.scale.y += explosionSpeed;

            if(explosionElem.scale.x > 1)
            {
                explosionElem.remove();
            }
        });

        // Check to see if enough time has elapsed since the last
        // mine was spawned, and if so, then call the function
        // to spawn a new mine.
        this.timeSinceLastMineSpawn += deltaTime;
        if(this.timeSinceLastMineSpawn >= mineSpawnInterval)
        {
            this.spawnMine();
            this.timeSinceLastMineSpawn = 0;
        }
    }

    // When the mouse moves, store the current position of the mouse.
    // The MouseEvent object reports mouse information in screen coordinates.
    // We need to convert them to normalized device coordinates so that
    // they are in the same reference frame as the objects in our scene.
    onMouseMove(event: MouseEvent): void {
        this.mousePosition = this.getNormalizedDeviceCoordinates(event.x, event.y);
    }

    onMouseDown(event: MouseEvent): void {
        this.shipTarget = this.getNormalizedDeviceCoordinates(event.x, event.y);
        this.ship.lookAt(this.mousePosition);
    }

    // This function creates a new mine.  In order to prevent infinite mines,
    // which would slow down the game, we limit the total number of mines.
    private spawnMine(): void
    {
        const mineSpawnDistance = 1.25;
        const mineLimit = 10;
        
        // This creates a new instance of the base mine object.
        // Note that the Mine class extends the ShapeInstance class,
        // so only the original object will be created in GPU memory.
        const mineInstance = new gfx.ShapeInstance(this.mine);
        this.mines.add(mineInstance);

        // Compute a random direction ahead of the ship and then translate
        // mine far enough away that it is outside the edge of the screen.
        //mineInstance.rotation = this.ship.rotation + (Math.random() * Math.PI / 3 - Math.PI / 6);
        mineInstance.rotation = Math.random() * Math.PI * 2;
        mineInstance.translateY(mineSpawnDistance);
        
        // If we are over the mine limit, remove the oldest one!
        if(this.mines.children.length > mineLimit)
        {
            const explosionInstance = new gfx.ShapeInstance(this.explosion);
            explosionInstance.position.copy(this.mines.children[0].position);
            explosionInstance.scale.set(0.25, 0.25);
            this.explosions.add(explosionInstance);
            this.mines.children[0].remove();
        }
    }
}