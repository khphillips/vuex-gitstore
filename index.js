const jetpack = require('fs-jetpack');
const gitP = require('simple-git/promise');
const _git = require('simple-git')
import merge from 'deepmerge';
import GitStoreModule from './GitStoreModule'

/**
you must either start with a clone or start with an init and set the remote. 
after that you can pull just fine. 
maybe always pull if the repo exists initially on startup. (will need to happen anyways with first push)
if no repo exists, don't cretae it until the repo and remote_url are set. 
if one is set, then you will have to copy everything over to the new directory and then clone/init

directory exists?
is it a repo? 	if yes, then hopefully the remote is already set. you can then pull
				if no, then you can either init or clone into it. 
**/

export default {
	options : {},
	key : null,
	repo : null,
	root_path : null,
	store : {},

	install(options){
		this.options = this.options || {};
		this.key = options.key || null; //'entities';//this is the vuex-orm default keys
		this.root_path = options.root_path || 'gitstoreData/';

		//checks if repo exists as a folder and initializes one if not.
		//if (this.repo){
		//	if(!jetpack.exists(this.root_path + this.repo)){
		//		this.checkRepo(this.repo);
		//	}
		//}
		
		var g = this;

		//returns to vues for install
	    var f = function(store) {
	    	console.log('plugin function')
	    	g.store = store;
	    	//register our module so we can store information about the repo. 
	    	store.registerModule('gitstore', 
			  	GitStoreModule
			)

	    	g.refreshStateFromRepo()

	    	//var g = this;
	    	//subscribes to ALL changes
		    store.subscribe(function(mutation, state) {
		    	console.log('subscribe', mutation);
		    	var repo = state.gitstore.repo;
		    	if (state.gitstore.repo){
			    	//if we have a key we are looking under use that... probably gonna cause an issue with deeply nested data.
			    	if(g.key != null){
			    		var key = mutation.payload.entity;
			    		var key_state = state[g.key][mutation.payload.entity];
			    	}else{
			    		key = null;
			    		if (mutation.type.indexOf('/')){
			    			//this is a module mutation, grab the data from that namespace.
			    			key = mutation.type.split('/')[0];
			    			key_state = state[key]
			    		}else{
			    			//don't have a key, grab the data from the root of state.
			    			key = mutation.payload.entity;
			    			key_state = state[key];
			    		}
			    	}
			    	//if object is marked as "persist == false" then don't store it. 
			    	if (typeof key_state != 'undefined' && (typeof key_state.persist == 'undefined' || key_state.persist === true) ){
			    		g.setObject(key, key_state, repo);
			    	}
			    }else{
			    	console.log('no repo - no save');
			    }
		  	})
	    }
	    return f;
	},


	//loads all files in repo and refreshes the state.
	refreshStateFromRepo(overwrite){
		var key = this.key
		var store = this.store
		var g = this;
		if(store.state.gitstore.repo){
			var path = this.root_path + store.state.gitstore.repo;
			console.log('path', path);
			var git = _git()
    			.pull('origin', 'master', function(err, data){
		    		console.log('pulled before refresh2', path)
		    		console.log('error?', err)
		    		//grab the entired saved state from the repo
			    	//TODO: do a pull from the remote if available to get the latest. 
			    	var savedState = {};
			    	var currentState = key ? store.state[key] : store.state;
			    	//only update the state for items we have files for.
			    	console.log(currentState) 
			    	for (var k in currentState){
			    		if (k.indexOf('$') == -1){
			    			console.log(store.state.gitstore.repo)
							var obj = g.getObject(k, store.state.gitstore.repo);
			    			if (obj != null){
			    				savedState[k] = obj;
			    			}
			    		}
			    	}
			    	var new_state = savedState;
			    	if (key){
			    		new_state = {}
			    		new_state[key] = savedState
			    	}
			    	console.log(new_state)
			    	if(overwrite === true){
			    		console.log('overwriting', {...store.state, ...new_state})
			    		store.replaceState({...store.state, ...new_state});
			    	}else{
			    		console.log('merging')
			    		store.replaceState(merge(store.state, new_state, {
				        	clone: false,
						}));
			    	}
				    
		    	})
	    }
	},

	newLocalRepo(repo, callback){
		var path = this.root_path + repo;
		if(jetpack.exists(path)){
			callback("Repository folder already exists! Aborting.")
		}else{
			jetpack.dir(path);
			jetpack.write(path + '/README.md', "A Vuex-GitStore Data Repository. https://github.com/khphillips/vuex-gitstore")
			var git = _git(path)
				.init()
				.add('./*');
			//then save the current data...	
			git.commit("First commit! Initializing Data");
			callback();
		}
	},


	loadLocalRepo(repo, callback){
		var path = this.root_path + repo;
		console.log('loading', path)
		if(!jetpack.exists(path)){
			callback("Repository folder does not exist!")
		}else{
			callback();
			this.refreshStateFromRepo(true)
		}
	},


	setupRepo(repo, url, callback){
		console.log('setup')
		var path = this.root_path + repo;
		if(jetpack.exists(path)){
			_git(path)
				.checkIsRepo(function(err, data){
					console.log(err, data);
					callback();
				})
		}else{
			//make the directory
			jetpack.dir(this.root_path + repo);
			_git(this.root_path + repo)
    			.clone(url, this.root_path + repo, function(err, data){
		    		console.log('cloned')
		    		callback();
		    	})
		}
	},

	/**
	 * Checks if the repo exists, if not create the path and initializes repo
	 * @param  {[type]} repo [description]
	 * @return {[type]}      [description]
	 */
	checkRepo(repo){
		if (repo){
			if(!jetpack.exists(this.root_path + repo)){
				jetpack.dir(this.root_path + repo);
				_git(this.root_path + repo)
					.init()
			}
		}
	},

	/**
	 * Creates the directory and initializes the repo with the default readme file. 
	 * @param  {[type]} repo [description]
	 * @return {[type]}      [description]
	 */
	initRepo(repo){
		jetpack.write(this.root_path + repo + '/README.md', "A Vuex-GitStore Data Repository. https://github.com/khphillips/vuex-gitstore")
		_git(this.root_path + repo)
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
		console.log(key, repo)
		if (repo){
			//this.checkRepo(repo);
			var path = this.root_path + repo + '/' + key + '.json';
		}else{
			path = this.root_path + key + '.json';
		}
		console.log('getting object from ', path)
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
    	console.log(key, repo)
        value = JSON.stringify(value, null, 2);
        var g = this
        if (repo){
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
    	var username = this.store.state.gitstore.username ? this.store.state.gitstore.username : 'gitData'
    	var email = this.store.state.gitstore.email ? this.store.state.gitstore.email : 'gitData@gitData.com'
    	var git = _git(this.root_path + repo)
        		.addConfig('user.name', username)
    			.addConfig('user.email', email)
    			.add(key + '.json')
       			.commit("Data update: " + key);
       	if (this.store.state.gitstore.remote_url != null && this.store.state.gitstore.repo != null){
       		var g = this;
    		this.addRemote(g.store.state.gitstore.repo, g.store.state.gitstore.remote_url, function(){
    			g.pushToRemote(g.store.state.gitstore.repo, g.store.state.gitstore.remote_url);
    		})
    	}
    },

    addRemote(repo, url, callback){
    	var g = _git(this.root_path + repo);
    	g.addRemote('origin', url, function(err, data){
		    		callback();
		    	})
    	return;
    	var remotes = g.getRemotes({'verbose' : true}, function(err, data){
    		console.log('adding remote', err, data)
    		if (err){
    			g.addRemote('origin', url, function(err, data){
		    		callback();
		    	})
    		}else{
    			callback();
    		}
    	});
    },

    pushToRemote(repo, url, callback){
    	console.log('pushing');
    	var g = _git(this.root_path + repo)
    		.push('origin', 'master', function(err, data){
	    		console.log('pushed', err, data)
	    		callback();
	    	})
    },

    pullFromRemote(repo, url, callback){
    	var g = this;
    	g.addRemote(repo, url, callback)
    	console.log('pullling');
    	_git(this.root_path + repo)
    		.pull('origin', 'master', function(err, data){
	    		console.log('pulled2')
	    		g.refreshStateFromRepo(g.key, g.store, repo, g)
	    		callback(err, data);
	    	})
    },

    cloneFromRemote(repo, url, callback){
    	var g = this;
    	console.log('cloning');
    	//make the directory
		jetpack.dir(this.root_path + repo);
		_git(this.root_path)
			.clone(url, repo, function(err, data){
	    		console.log('cloned')
	    		g.refreshStateFromRepo(g.key, g.store, repo, g)
	    		callback();
		    })
    }
    
}