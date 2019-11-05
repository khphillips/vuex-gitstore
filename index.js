const jetpack = require('fs-jetpack');
const gitP = require('simple-git/promise');
const _git = require('simple-git')
import merge from 'deepmerge';
import GitStoreModule from './GitStoreModule'

export default {
	options : {},
	key : null,
	repo : null,
	root_path : null,

	store : {},

	install(options){
		this.options = this.options || {};
		this.key = options.key || null; //'entities';//this is the vuex-orm default keys
		this.repo = options.repo || 'data';
		this.root_path = options.root_path || 'gitstoreData/';

		//checks if repo exists as a folder and initializes one if not.
		if (this.repo){
			if(!jetpack.exists(this.root_path + this.repo)){
				this.checkRepo(this.repo);
			}
		}
		
		var g = this;

		//returns to vues for install
	    return function(store) {
	    	g.store = store;
	    	//register our module so we can store information about the repo. 
	    	store.registerModule('gitstore', 
			  	GitStoreModule
			)

	    	//grab the entired saved state from the repo
	    	//TODO: do a pull from the remote if available to get the latest. 
	    	var savedState = {};
	    	var currentState = g.key ? store.state[g.key] : store.state;
	    	//only update the state for items we have files for. 
	    	for (var k in currentState){
	    		if (k.indexOf('$') == -1){
	    			var repo = g.whichRepo(currentState[k], currentState)
    				var obj = g.getObject(k, currentState[k].repo != null ? currentState[k].repo : g.repo);
	    			if (obj != null){
	    				savedState[k] = obj;
	    			}
	    		}
	    	}
	    	var new_state = savedState
	    	//if we have a key, then we will update the key of saved state with the new state from git repo. 
	    	if (g.key){
	    		new_state = {}
	    		new_state[g.key] = savedState
	    	}
		    store.replaceState(merge(store.state, new_state, {
		        clone: false,
			}));
		    
		    //subscribes to ALL changes
		    store.subscribe(function(mutation, state) {
		    	//if we have a key we are looking under use that... probably gonna cause an issue with deeply nested data.
		    	if(g.key != null){
		    		var key = mutation.payload.entity;
		    		var key_state = state[g.key][mutation.payload.entity];
		    		var repo = g.whichRepo(state[g.key][mutation.payload.entity], state);
		    	}else{
		    		var key = null;
		    		if (mutation.type.indexOf('/')){
		    			//this is a module mutation, grab the data from that namespace.
		    			var key = mutation.type.split('/')[0];
		    			key_state = state[key]
		    		}else{
		    			//don't have a key, grab the data from the root of state.
		    			key = mutation.payload.entity;
		    			key_state = state[key];
		    		}
		    		repo = g.whichRepo({}, state);
		    	}
		    	//if object is marked as "persist == false" then don't store it. 
		    	if (typeof key_state != 'undefined' && (typeof key_state.persist == 'undefined' || key_state.persist === true) ){
		    		g.setObject(key, key_state, repo);
		    	}
		  	})
	    }
	},

	//give the information find out which is the most approrpriate repo to store...
	//If the object passed has a "repo" assigned, then store it there
	//Next check if the fitstore state has a repo assigned
	//last if none of the others, use the repo assigned int he options when plugin was installed. 
	whichRepo(object, state){
		if (typeof object != 'undefined' && typeof object.repo != 'undefined' && object.repo != null){
			return object.repo;
		}
		if (typeof state.gitstore != 'undefined' && state.gitstore != null){
			if (typeof state.gitstore.state.repo != 'undefined' && state.gitstore.state.repo != null){
				return state.gitstore.state.repo;
			}
		}
		return this.repo;
	},

	/**
	 * Checks if the repo exists, if not create the path and initializes repo
	 * @param  {[type]} repo [description]
	 * @return {[type]}      [description]
	 */
	checkRepo(repo){
		if (repo){
			if(!jetpack.exists(this.root_path + repo)){
				this.initRepo(repo);
			}
		}
	},

	/**
	 * Creates the directory and initializes the repo with the default readme file. 
	 * @param  {[type]} repo [description]
	 * @return {[type]}      [description]
	 */
	initRepo(repo){
		jetpack.dir(this.root_path + repo);
		jetpack.write(this.root_path + repo + '/README.md', "A Vuex-GitStore Data Repository. https://github.com/khphillips/vuex-gitstore")
		_git(this.root_path + repo)
			.init()
			.add('./*')
			.commit("First commit! Initializing Data")
	},

	/**
	 * Workhorse... gets a key from the repo, parses the json and returns it. 
	 * @param  {[type]} key  [description]
	 * @param  {[type]} repo [description]
	 * @return {[type]}      [description]
	 */
	getObject(key, repo){
		if (this.repo){
			this.checkRepo(repo);
			var path = this.root_path + this.repo + '/' + key + '.json';
		}else{
			path = this.root_path + key + '.json';
		}
		var str = jetpack.read(path);
		if (typeof str == 'undefined'){
			return null
		}
        return JSON.parse(str);
	},

	/**
	 * Workhorse.... sets a key value pair and saves it to the repo as JSON. 
	 * Uses Async write so it doesn't hodl anythign up...
	 * TODO: if remote url is available, try pushing to remote... maybe debounce that shit. 
	 * @param {[type]} key   [description]
	 * @param {[type]} value [description]
	 * @param {[type]} repo  [description]
	 */
    setObject(key, value, repo) {
        value = JSON.stringify(value, null, 2);
        var g = this
        if (this.repo){
        	this.checkRepo(repo);
        	jetpack.writeAsync(this.root_path + repo + "/" + key + '.json', value)
        	this.commitObjects(key, repo);
        }else{
        	jetpack.writeAsync(this.root_path + key + '.json', value)
        }
    },

    /**
     * Commits the changes to the data in the repo. 
     * @param  {[type]} key  [description]
     * @param  {[type]} repo [description]
     * @return {[type]}      [description]
     */
    commitObjects(key, repo){
    	console.log(this.store.gitstore.state);
    	var g = _git(this.root_path + repo)
        		.addConfig('user.name', 'DarkNote')
    			.addConfig('user.email', 'some@one.com')
    			.add(key + '.json')
       			.commit("Data update: " + key);
    }
    
}