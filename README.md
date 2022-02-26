
Scripts for playing Bitburner - https://danielyxie.github.io/bitburner/

This is based on the VS Code template project at https://github.com/bitburner-official/vscode-template

## About the scripts

These are automation scripts for the game Bitburner. They are very much end-game scripts - they rely on APIs that are not
unlocked at the beginning of the game, and require more memory than a starting server has.

__There are huge spoilers for the whole game in this README and in the scripts.__

The individual components are reasonably standalone, so running, for example, the corporation scripts or the gang scripts 
independently shouldn't be too hard. 

The scripts are divided into directories by function - this has a close but not exact correspondence to the Bitnodes
in which the capability is acquired.

Conventions:

* Library files begin with `lib` and are not intended to be run directly. The
  top-level library files (`libPorts`, `libFormat`, and to a lesser extent
  `libServers`) are pulled in by many lower-level scripts.
* Scripts beginning `manage` run in a continuous loop - e.g. `manageGang` deals
    with all aspects of running a gang, and expects to be running at all
    times while a gang exists.
* Scripts called `...Control` set values on ports that pass instructions
    to other scripts - e.g. `gangControl` manually sets the priorities for 
    the `manageGang` script to be gaining money, gaining respect, etc.
* Scripts typically co-ordinate via ports (using the code in `libPorts`) - e.g. 
    the `manageCorp` script reports the status of the corporation to a port,
    and then other scripts such as `selectSleeveTask` can use that information 
    to determine what to do without needing to call corporation scripts. The
    `report...` scripts write to a port with an appropriate report.
* The initial loop script is `bootstrap`. This loops through a basic set of starting
    actions, and once the criteria to move to phase two (e.g. enough money and memory)
    have been reached, then it swaps to `launchAll`, which runs continuously
    for the rest of the bitnode, looping through a wider set of scripts.

The directories, and the most notable scripts in them, are:

* __attack__ - a batched hack script `attack` to run simultaneous hack/weaken/grow/weaken
        attacks on a target server, with `listTargets` to work out the most effective target
        to attack based on source memory size, return on investment over time, etc. 
  
* __augment__ - purchase augmentations via `buyAugments` when sufficient are available via
        a faction or gang, then spend any left over money via `buyLastingPurchases`, and
        restart via `augmentAndRestart`. If the bitnode can be completed, finish it
        via `completeBitnode` and automatically start the next one, running bootstrap.
  
* __basic__ - a set of simple scripts to buy cracks, install backdoors, run crack scripts
        on servers, upgrade memory, etc. These are basic tasks that are called in a loop
        from the bootstrap and launchAll scripts.
  
* __bladeburner__ - `manageBladeburner` is a simple bladeburner automation script.

* __casino__ - cheat at coin flipping in the casino, and cheat at blackjack, using
        DOM automation to press buttons.

* __contracts__ - solve all available contracts via `solveContracts`

* __corp__ - start a corporation via `startCorp`, expand it until it has taken its
        first investment via `manageStartup`, and then expand it until it goes public
        via `manageCorp`. There are various classes in the library files to set product
        pricing, buy research, name new products, simplify office and warehouse management,
        buy goods to increase production multipliers, etc.

* __crime__ - carry out automated crimes via `commitCrime`, and start a gang via `startGang`
        and manage it via `manageGang`, which manages all aspects of growing the gang such 
        as training, ascending, buying equipment and earning mony. The `intermittentWarfare` 
        script runs alongside `manageGang` and switches gang members to do territory warfare 
        every time the game checks for that. `gangControl` allows manual override of the 
        preferred tasks for the gang - e.g. `gangControl money` will make the gang focus on 
        earning money.

* __hacknet__ - buy and upgrade hacknet nodes via `upgradeNodes`, based on the expected time
        for payback from those nodes; and then `selectHashTarget` chooses the most appropriate
        thing to spend them on based on the state of the game (e.g. corporation money for a
        startup, corporation research for an established corporation, improved gym training 
        if all the sleeves are in the gym, and so on)

* __reporting__ - write out `events.txt` and `regularLog.txt` CSV files, respectively for
        significant events and every hour, with information on the current game state.
  
* __sleeve__ - set sleeve tasks, either automatically with `selectSleeveTask` based on the
        current game state, or manually with `sleeveControl`. The former will wait for sleeves
        to recover shock, then train them in the gym until their stats are high enough, then
        have them commit crimes until a gang is formed.
  
* __spread__ - `spreadAttackController` is a hacking script that launches hack or grow or weaken
        scripts on each hacked server, and has them all attack a single target. The target
        can be set via `setTarget`.
  
* __stanek__ - loads in a set of fragments to Stanek's gift via `loadFragments` from a text file
        description, then charge it with `chargeFragments`. `launchChargeFragments` will do so 
        with all available threads.
  
* __tix__ - makes money on the stockmarket via `stockTrade`. Alternatively, `recordStockHistory`
        will write all the stockmarket events to an indexeddb database, and once they have 
        been recorded, `stockTrade` can be set to use these stored events as a way of testing
        the effectiveness of the stock trading algorithms.
  
* __root__ - the top level `bootstrap` and `launchAll` scripts that launch all the others,
        and the `uiDashboard` that displays additional information in the overview.

## Typical progression

After running bootstrap on a standard node - e.g. BN12:

* Study until at a base level of hacking, with help from sleeves
* Commit crimes until there is enough money to travel, with help from sleeves
* Cheat at the casino to get some starter money
* Start hacking servers, buying cracks, upgrading memory, until the next level is reached, 
  then switch to the next control script which does more of the same
* Meanwhile, the sleeves will reduce shock, then train at the gym, then commit crimes, until a gang is formed
    * The gang members will train, then commit crimes, ascending when viable
    * New members will be recruited when possible, and equipped  
    * Simultaneously, the gang increases its power and starts territory warface when it has substantally 
      more power than the other gangs
* Meanwhile, once there is enough money for a corporation, form one.
    * The corporation makes materials initially, then once its warehouses are full then it will 
        sell everything and find investors
    * After the first stage of investment, it develops three products, then seeks further investment
        once all three are available and have appropriate prices
    * Then the corporation grows, reinvesting all profits, until it is profitable enough to go public
    * At that point, it issues dividends, and bribes Daedalus when necessary
* Meanwhile, whenever there are sufficient augmentations available from a faction or from the gang,
    install them and restart. 
    * Before the first restart, install Stanek's Gift, and charge it after each restart
    * Once possible, join Daedalus, take the Red Pill, complete the bitnode, and 
        automatically start the next one.
    
The gang's main goal is to make augmentations available. The corporation's main goal is to provide
a vast amount of money and to bribe Daedalus. However, the Bitnode should complete successfully
(although more slowly) without either or both of those.

## Set up and build

For initial setup:

```
npm install
npm run defs
```

To compile the TypeScript to JavaScript in the `dist` directory: 

```
npm run watch
```

To send the `dist` files across to the game - edit package.json to add your bitburnerAuthToken 
(obtain from API Server | Copy Auth Token when running via Steam), then run:

```
npm run sync 
```

Read the fuller documentation in the template project repo for more information.

## License

Copyright (C) 2022 Inigo Surguy.

Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is 
hereby granted, provided that the above copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE 
INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE
FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM 
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, 
ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.