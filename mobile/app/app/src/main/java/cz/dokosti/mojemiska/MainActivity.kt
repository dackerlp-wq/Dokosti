package cz.dokosti.mojemiska

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material.icons.filled.Pets
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

private val green = Color(0xFF2A382E)
private val cream = Color(0xFFF3ECDD)
private val brick = Color(0xFFC85A28)
private val muted = Color(0xFF55645A)
private val paper = Color(0xFFFBF7EE)
private const val api = "https://tpzeltvekvliqluhfrvn.supabase.co"
private const val publishable = "sb_publishable_ze8lLGxJM8e2b4IDgRti1w_PsIZhj8w"

private suspend fun request(path: String, method: String = "GET", token: String? = null, body: JSONObject? = null): String =
    withContext(Dispatchers.IO) {
        val connection = URL(api + path).openConnection() as HttpURLConnection
        try {
            connection.requestMethod = method
            connection.connectTimeout = 12000
            connection.readTimeout = 18000
            connection.setRequestProperty("apikey", publishable)
            connection.setRequestProperty("Content-Type", "application/json")
            connection.setRequestProperty("Accept", "application/json")
            if (token != null) connection.setRequestProperty("Authorization", "Bearer $token")
            if (body != null) {
                connection.doOutput = true
                connection.outputStream.use { it.write(body.toString().toByteArray()) }
            }
            val status = connection.responseCode
            val result = (if (status in 200..299) connection.inputStream else connection.errorStream)
                ?.bufferedReader()?.use { it.readText() } ?: ""
            if (status !in 200..299) {
                val description = try {
                    val json = JSONObject(result)
                    json.optString("msg").ifBlank { json.optString("message").ifBlank { json.optString("error_description") } }
                } catch (_: Exception) { "" }
                error(if (status == 401 || status == 403) "Přístup zamítnut. Přihlaste se znovu." else description.ifBlank { "HTTP $status" })
            }
            result
        } finally { connection.disconnect() }
    }

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme(colorScheme = lightColorScheme(primary=green, secondary=brick, background=cream, surface=paper, onSurface=green)) {
                MojeMiska()
            }
        }
    }
}

@Composable
private fun MojeMiska() {
    var token by remember { mutableStateOf("") }
    var userEmail by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var pass by remember { mutableStateOf("") }
    var otp by remember { mutableStateOf("") }
    var sent by remember { mutableStateOf(false) }
    var usePassword by remember { mutableStateOf(false) }
    var loading by remember { mutableStateOf(false) }
    var message by remember { mutableStateOf("") }
    var tab by remember { mutableIntStateOf(0) }
    var pets by remember { mutableStateOf(JSONArray()) }
    var orders by remember { mutableStateOf(JSONArray()) }
    var customer by remember { mutableStateOf(JSONObject()) }
    var items by remember { mutableStateOf(JSONArray()) }
    val scope = rememberCoroutineScope()

    fun loadAccount(t: String) {
        scope.launch {
            loading = true
            try {
                pets = JSONArray(request("/rest/v1/pets?select=id,name,species,weight_kg&order=updated_at.desc&limit=20", token=t))
                orders = JSONArray(request("/rest/v1/orders?select=id,order_number,status,total_czk,created_at&order=created_at.desc&limit=30", token=t))
                val customers = JSONArray(request("/rest/v1/customers?select=id,name,points&limit=1", token=t))
                customer = if (customers.length() > 0) customers.getJSONObject(0) else JSONObject()
                items = JSONArray(request("/rest/v1/products?select=slug,variant,price_czk,stock_qty,in_stock,is_complete&is_published=eq.true&limit=20", token=t))
                message = ""
            } catch (e: Exception) {
                message = "Nelze načíst data: ${e.message}"
            } finally { loading = false }
        }
    }

    fun login(mode: String) {
        scope.launch {
            loading = true
            message = ""
            try {
                val response = when (mode) {
                    "password" -> request("/auth/v1/token?grant_type=password", "POST", body=JSONObject().put("email",email.trim()).put("password",pass))
                    "verify" -> request("/auth/v1/verify", "POST", body=JSONObject().put("email",email.trim()).put("token",otp.trim()).put("type","email"))
                    else -> request("/auth/v1/otp", "POST", body=JSONObject().put("email",email.trim()).put("create_user",false))
                }
                if (mode == "send") { sent = true; message = "Zkontrolujte e-mail a zadejte osmimístný kód." }
                else {
                    val payload = JSONObject(response)
                    token = payload.getString("access_token")
                    userEmail = payload.optJSONObject("user")?.optString("email") ?: email
                    loadAccount(token)
                }
            } catch (e: Exception) { message = e.message ?: "Přihlášení selhalo." }
            finally { loading = false }
        }
    }


    Column(Modifier.fillMaxSize().background(cream)) {
        if (token.isBlank()) {
            Column(Modifier.fillMaxWidth().background(green).padding(24.dp)) {
                Text("Moje miska",fontSize=27.sp,color=Color.White,fontWeight=FontWeight.Bold)
                Text("by DoKosti",fontSize=13.sp,color=Color(0xFFE6A06A))
            }
            Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(22.dp),verticalArrangement=Arrangement.spacedBy(14.dp)) {
                Text("Vítejte zpátky",fontSize=28.sp,fontWeight=FontWeight.Bold,color=green)
                Text("Přihlaste se účtem DoKosti.",color=muted)
                OutlinedTextField(email,{email=it;sent=false;otp=""},label={Text("E-mail")},modifier=Modifier.fillMaxWidth(),singleLine=true,keyboardOptions=KeyboardOptions(keyboardType=KeyboardType.Email),shape=RoundedCornerShape(15.dp))
                if(usePassword) {
                    OutlinedTextField(pass,{pass=it},label={Text("Heslo")},singleLine=true,modifier=Modifier.fillMaxWidth(),visualTransformation=PasswordVisualTransformation(),shape=RoundedCornerShape(15.dp))
                    Button(onClick={login("password")},enabled=!loading && email.contains("@") && pass.isNotBlank(),modifier=Modifier.fillMaxWidth()){Text("Přihlásit se")}
                } else {
                    if(sent) {
                        OutlinedTextField(otp,{otp=it.filter(Char::isDigit).take(8)},label={Text("Osmimístný kód")},modifier=Modifier.fillMaxWidth(),singleLine=true,keyboardOptions=KeyboardOptions(keyboardType=KeyboardType.Number),shape=RoundedCornerShape(15.dp))
                        Button(onClick={login("verify")},enabled=!loading && otp.length==8,modifier=Modifier.fillMaxWidth()){Text("Ověřit kód")}
                    }
                    OutlinedButton(onClick={login("send")},enabled=!loading && email.contains("@"),modifier=Modifier.fillMaxWidth()){Text(if(sent)"Poslat nový kód" else "Poslat přihlašovací kód")}
                }
                TextButton(onClick={usePassword=!usePassword}){Text(if(usePassword)"Použít e-mailový kód" else "Přihlásit se heslem")}
                if(loading) LinearProgressIndicator(Modifier.fillMaxWidth())
                if(message.isNotBlank())Text(message,color=brick)
                Text("Testovací verze: nákupy ani platby zatím neprovádí.",fontSize=12.sp,color=muted)
            }
        } else {
            Column(Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(horizontal=16.dp, vertical=12.dp),verticalArrangement=Arrangement.spacedBy(12.dp)) {
                if(loading) LinearProgressIndicator(Modifier.fillMaxWidth())
                if(message.isNotBlank()) Text(message,color=brick,fontSize=12.sp)
                when(tab) {
                    0 -> Home05(pets,orders,customer,items,onTab={tab=it},onRefresh={loadAccount(token)})
                    1 -> {
                        ScreenHeader("Mazlíčci","Váš svět na čtyřech tlapkách")
                        if(pets.length()==0) ActionCard(Icons.Outlined.Pets,"Zatím bez profilu","Profil můžete přidat na dokosti.cz"){}
                        for(i in 0 until pets.length()){
                            val p=pets.getJSONObject(i)
                            ActionCard(Icons.Outlined.Pets,p.optString("name","Mazlíček"),p.optString("species","Mazlíček")){}
                        }
                    }
                    2 -> {
                        ScreenHeader("Nákupy","Objednávky a nabídka DoKosti")
                        if(orders.length()==0) ActionCard(Icons.Outlined.ShoppingBag,"Zatím bez objednávek","Po nákupu se vaše objednávky zobrazí tady"){}
                        for(i in 0 until orders.length()){
                            val o=orders.getJSONObject(i)
                            ActionCard(Icons.Outlined.ReceiptLong,o.optString("order_number","Objednávka"),"${o.optInt("total_czk")} Kč · ${o.optString("status")}"){}
                        }
                        Text("Produkty DoKosti",fontWeight=FontWeight.Bold,fontSize=20.sp,color=green)
                        for(i in 0 until minOf(items.length(),12)){
                            val p=items.getJSONObject(i)
                            ActionCard(Icons.Outlined.ShoppingBasket,p.optString("variant").ifBlank{p.optString("slug")},"${p.optInt("price_czk")} Kč · ${if(p.optBoolean("in_stock"))"Skladem dle katalogu" else "Není skladem"}"){}
                        }
                        Text("Opakování objednávky zatím pouze připravujeme. Aplikace nevytváří nákup.",color=muted,fontSize=12.sp)
                    }
                    3 -> {
                        ScreenHeader("Péče","Důležité termíny a zdraví")
                        ActionCard(Icons.Outlined.CalendarMonth,"Termíny","Kalendář péče připravujeme"){}
                        ActionCard(Icons.Outlined.HealthAndSafety,"Veterinární péče","Zatím nemáte evidované termíny"){}
                        ActionCard(Icons.Outlined.Inventory2,"Domácí zásoby","Sledování krmiva připravujeme"){}
                    }
                    else -> {
                        ScreenHeader("Více","Účet a užitečné informace")
                        ActionCard(Icons.Outlined.Person,"Můj účet",userEmail){}
                        ActionCard(Icons.Outlined.Stars,"Kostičky",if(customer.has("points")&&!customer.isNull("points"))"${customer.optInt("points")}" else "Nejsou dostupné"){}
                        ActionCard(Icons.Outlined.LocationOn,"V okolí","Služby připravujeme"){}
                        OutlinedButton(onClick={loadAccount(token)},modifier=Modifier.fillMaxWidth()){Icon(Icons.Outlined.Refresh,null);Text(" Aktualizovat")}
                        OutlinedButton(onClick={token="";userEmail="";pets=JSONArray();orders=JSONArray();items=JSONArray()},modifier=Modifier.fillMaxWidth()){Icon(Icons.Outlined.Logout,null);Text(" Odhlásit se")}
                        Text("Moje miska · 0.5 testovací verze",fontSize=12.sp,color=muted)
                    }
                }
            }
            NavigationBar(containerColor=green,tonalElevation=0.dp) {
                val names=listOf("Domů","Mazlíčci","Nákupy","Péče","Více")
                val icons=listOf(Icons.Outlined.Home,Icons.Outlined.Pets,Icons.Outlined.ShoppingBag,Icons.Outlined.CalendarMonth,Icons.Outlined.MoreHoriz)
                names.forEachIndexed { index,name ->
                    NavigationBarItem(selected=tab==index,onClick={tab=index},
                        icon={Icon(icons[index],null,modifier=Modifier.size(23.dp))},
                        label={Text(name,fontSize=10.sp)},
                        colors=NavigationBarItemDefaults.colors(selectedIconColor=green,selectedTextColor=Color.White,indicatorColor=Color(0xFFF7E5CC),unselectedIconColor=Color(0xFFDDE5DB),unselectedTextColor=Color(0xFFDDE5DB)))
                }
            }
        }
    }
}

@Composable
private fun InfoCard(title:String,subtitle:String) {
    Card(modifier=Modifier.fillMaxWidth(),shape=RoundedCornerShape(18.dp),
        colors=CardDefaults.cardColors(containerColor=paper)) {
        Column(Modifier.padding(18.dp),verticalArrangement=Arrangement.spacedBy(7.dp)) {
            Text(title, fontSize=18.sp, fontWeight=FontWeight.SemiBold, color=green)
            Text(subtitle, fontSize=14.sp, color=muted)
        }
    }
}


@Composable
private fun ScreenHeader(title:String,subtitle:String){
    Column(verticalArrangement=Arrangement.spacedBy(4.dp)){
        Text(title,color=green,fontSize=27.sp,fontWeight=FontWeight.Bold)
        Text(subtitle,color=muted,fontSize=13.sp)
    }
}
@Composable
private fun ActionCard(icon:ImageVector,title:String,subtitle:String,onClick:()->Unit){
    Card(Modifier.fillMaxWidth().clickable(onClick=onClick),shape=RoundedCornerShape(19.dp),border=BorderStroke(1.dp,Color(0xFFE5D9CA)),colors=CardDefaults.cardColors(containerColor=paper)){
        Row(Modifier.padding(14.dp),verticalAlignment=Alignment.CenterVertically,horizontalArrangement=Arrangement.spacedBy(12.dp)){
            Box(Modifier.size(48.dp).background(Color(0xFFF4E2CE),RoundedCornerShape(15.dp)),contentAlignment=Alignment.Center){
                Icon(icon,null,tint=brick,modifier=Modifier.size(25.dp))
            }
            Column(Modifier.weight(1f),verticalArrangement=Arrangement.spacedBy(3.dp)){
                Text(title,fontWeight=FontWeight.Bold,color=green,fontSize=15.sp,maxLines=2,overflow=TextOverflow.Ellipsis)
                Text(subtitle,color=muted,fontSize=12.sp,maxLines=2,overflow=TextOverflow.Ellipsis)
            }
            Icon(Icons.Outlined.ChevronRight,null,tint=muted)
        }
    }
}
@Composable
private fun Quick05(modifier:Modifier,icon:ImageVector,title:String,primary:Boolean,onClick:()->Unit){
    Card(modifier.height(105.dp).clickable(onClick=onClick),shape=RoundedCornerShape(20.dp),colors=CardDefaults.cardColors(containerColor=if(primary)green else Color(0xFFF3E0CB))){
        Column(Modifier.fillMaxSize().padding(11.dp),verticalArrangement=Arrangement.SpaceBetween,horizontalAlignment=Alignment.CenterHorizontally){
            Icon(icon,null,tint=if(primary)Color.White else brick,modifier=Modifier.size(30.dp))
            Text(title,color=if(primary)Color.White else green,fontWeight=FontWeight.Bold,fontSize=12.sp,lineHeight=15.sp,maxLines=2,textAlign=TextAlign.Center)
        }
    }
}
@Composable
private fun SmallMetric(modifier:Modifier,icon:ImageVector,title:String,value:String){
    Column(modifier,horizontalAlignment=Alignment.CenterHorizontally,verticalArrangement=Arrangement.spacedBy(4.dp)){
        Icon(icon,null,tint=brick,modifier=Modifier.size(22.dp))
        Text(title,color=muted,fontSize=10.sp,maxLines=1)
        Text(value,color=green,fontSize=12.sp,fontWeight=FontWeight.Bold,maxLines=1,overflow=TextOverflow.Ellipsis)
    }
}
@Composable
private fun Home05(pets:JSONArray,orders:JSONArray,customer:JSONObject,items:JSONArray,onTab:(Int)->Unit,onRefresh:()->Unit){
    val p=pets.optJSONObject(0)
    val dogName=p?.optString("name")?.takeIf{it.isNotBlank()}
    val greeting=dogName ?: "parťáku"
    val species=p?.optString("species")?.let{if(it=="pes")"Pes" else if(it=="kocka")"Kočka" else it} ?: "Mazlíček"
    val weight=p?.opt("weight_kg")?.toString()?.takeUnless{it=="null"}?.let{" · $it kg"} ?: ""
    val points=if(customer.has("points")&&!customer.isNull("points"))customer.optInt("points").toString() else "—"
    Box(Modifier.fillMaxWidth().background(Brush.linearGradient(listOf(Color(0xFF203D2F),Color(0xFF48633E))),RoundedCornerShape(26.dp)).padding(19.dp)){
        Column(verticalArrangement=Arrangement.spacedBy(13.dp)){
            Row(verticalAlignment=Alignment.CenterVertically){
                Icon(Icons.Filled.Pets,null,tint=Color(0xFFEFA15B),modifier=Modifier.size(28.dp))
                Spacer(Modifier.width(10.dp))
                Column(Modifier.weight(1f)){
                    Text("Moje miska",color=Color.White,fontSize=22.sp,fontWeight=FontWeight.Bold)
                    Text("by DoKosti",color=Color(0xFFF0AE77),fontSize=12.sp)
                }
                IconButton(onClick=onRefresh){Icon(Icons.Outlined.Refresh,"Aktualizovat",tint=Color.White)}
                IconButton(onClick={onTab(4)}){Icon(Icons.Outlined.AccountCircle,"Účet",tint=Color.White)}
            }
            Text("Ahoj, $greeting!",color=Color.White,fontWeight=FontWeight.Bold,fontSize=28.sp)
            Text("Všechno důležité pro vašeho parťáka.",color=Color(0xFFF3ECDD),fontSize=13.sp)
            Card(Modifier.fillMaxWidth().clickable{onTab(1)},shape=RoundedCornerShape(22.dp),colors=CardDefaults.cardColors(containerColor=paper)){
                Column(Modifier.padding(16.dp),verticalArrangement=Arrangement.spacedBy(14.dp)){
                    Row(verticalAlignment=Alignment.CenterVertically,horizontalArrangement=Arrangement.spacedBy(12.dp)){
                        Box(Modifier.size(64.dp).background(Color(0xFFF3DFC4),RoundedCornerShape(22.dp)),contentAlignment=Alignment.Center){
                            Icon(Icons.Filled.Pets,null,tint=brick,modifier=Modifier.size(33.dp))
                        }
                        Column(Modifier.weight(1f)){
                            Text(dogName ?: "Přidejte mazlíčka",color=green,fontWeight=FontWeight.Bold,fontSize=19.sp)
                            Text(if(p!=null)"$species$weight" else "Profil zatím není založený",color=muted,fontSize=12.sp)
                        }
                        Icon(Icons.Outlined.ChevronRight,null,tint=green)
                    }
                    HorizontalDivider(color=Color(0xFFE7DECE))
                    Row(horizontalArrangement=Arrangement.spacedBy(8.dp)){
                        SmallMetric(Modifier.weight(1f),Icons.Outlined.EventAvailable,"Další péče","Nenastaveno")
                        SmallMetric(Modifier.weight(1f),Icons.Outlined.Inventory2,"Zásoby","Nenastaveno")
                        SmallMetric(Modifier.weight(1f),Icons.Outlined.Stars,"Kostičky",points)
                    }
                }
            }
        }
    }
    Text("Rychlé akce",color=green,fontSize=20.sp,fontWeight=FontWeight.Bold)
    Row(horizontalArrangement=Arrangement.spacedBy(9.dp)){
        Quick05(Modifier.weight(1f),Icons.Outlined.ShoppingCart,"Objednat znovu",true){onTab(2)}
        Quick05(Modifier.weight(1f),Icons.Outlined.Inventory2,"Moje zásoby",false){onTab(3)}
        Quick05(Modifier.weight(1f),Icons.Outlined.EventAvailable,"Péče",false){onTab(3)}
        Quick05(Modifier.weight(1f),Icons.Outlined.LocationOn,"V okolí",false){onTab(4)}
    }
    Text("Co je potřeba vyřešit",color=green,fontSize=20.sp,fontWeight=FontWeight.Bold)
    ActionCard(Icons.Outlined.CalendarMonth,"Péče o mazlíčka","Žádné termíny zatím nejsou nastavené"){onTab(3)}
    ActionCard(Icons.Outlined.Inventory2,"Domácí zásoby","Sledování zásob připravujeme"){onTab(3)}
    Text("Poslední objednávka",color=green,fontSize=20.sp,fontWeight=FontWeight.Bold)
    val order=orders.optJSONObject(0)
    if(order!=null) ActionCard(Icons.Outlined.ReceiptLong,order.optString("order_number","Objednávka"),"${order.optInt("total_czk")} Kč · ${order.optString("status")}"){onTab(2)}
    else ActionCard(Icons.Outlined.ShoppingBag,"Zatím žádná objednávka","Vaše nákupy se tu zobrazí automaticky"){onTab(2)}
    if(items.length()>0){
        Text("Z nabídky DoKosti",color=green,fontSize=20.sp,fontWeight=FontWeight.Bold)
        for(i in 0 until minOf(items.length(),3)){
            val item=items.getJSONObject(i)
            ActionCard(Icons.Outlined.ShoppingBasket,item.optString("variant").ifBlank{item.optString("slug")},"${item.optInt("price_czk")} Kč · ${if(item.optBoolean("in_stock"))"Skladem dle katalogu" else "Není skladem"}"){onTab(2)}
        }
    }
    Text("Informace o péči a domácích zásobách jsou zatím připravované. Objednávky a Kostičky pocházejí z DoKosti.",color=muted,fontSize=11.sp,modifier=Modifier.padding(bottom=6.dp))
}
