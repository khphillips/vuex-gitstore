# vuex-gitstore

Intended use with Electron or server side javascript as it needs access to the local file system. git-js dependency. Will save the entire store.state to individual json files for each key within the root. Options to pass a key to store only portions of the state. 

```javascript
import Vue from 'vue'
import Vuex from 'vuex'
import GitStore from 'vuex-gitstore'

Vue.use(Vuex)

const store = new Vuex.Store({
  plugins: [
  	GitStore.install({})//pass options.
  	]
})

export default store
```

## Pass options

__key__ if you only want to target one key within the vuex store state, assign it here. For example with Vuex ORM use {key : 'entities'},

__repo__ rename the default repo folder/name to something else. default is 'data'
{repo : 'my_data_repo'}

__root_path__ change where the json files are kept. default is 'gitstoreData/'
{repo : 'my_data/somewhere_else/'}

## User with Vuex ORM

```javascript
import Vue from 'vue'
import Vuex from 'vuex'
import VuexORM from '@vuex-orm/core'
import config from '../../config'
import Item from '../models/Item'

Vue.use(Vuex)

const database = new VuexORM.Database()

database.register(Item)

const store = new Vuex.Store({
  plugins: [
  	VuexORM.install(database),
  	config.storage.driver.install({
  		//key : 'entities', 
  		//repo : 'darknote'
  	})
  	]
})

export default store
```